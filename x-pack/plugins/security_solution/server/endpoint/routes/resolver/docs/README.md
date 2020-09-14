# Resolver Backend

This readme will describe the backend implementation for resolver.

## Ancestry Array

The ancestry array is an array of entity_ids. This array is included with each event sent by the elastic endpoint
and defines the ancestors of a particular process. The array is formatted such that [0] of the array contains the direct
parent of the process. [1] of the array contains the grandparent of the process. For example if Process A spawned process
B which spawned process C. Process C's array would be [B,A].

The presence of the ancestry array makes querying ancestors and children for a process more efficient.

## Ancestry Array Limit

The ancestry array is currently limited to 20 values. The exact limit should not be relied on though.

## Ancestors

To query for ancestors of a process leveraging the ancestry array, we first retrieve the lifecycle events for the event_id
passed in. Once we have the origin node we can check to see if the document has the `process.Ext.ancestry` array. If
it does we can perform a search for the values in the array. This will retrieve all the ancestors for the process of interest
up to the limit of the ancestry array. Since the array is capped at 20, if the request is asking for more than 20
ancestors we will have to examine the most distant ancestor that has been retrieved and use its ancestry array to retrieve
the next set of results to fulfill the request.

### Pagination

After the backend gathers the results for an ancestry query, it will set a pagination cursor depending on the results from ES.

If the number of ancestors we have gathered is equal to the size in the request we don't know if ES has more results or not. So we will set `nextAncestor` to the entity_id of the most distant ancestor retrieved.

If the request asked for 10 and we only found 8 from ES, we know for sure that there aren't anymore results. In this case we will set `nextAncestor` to `null`.

### Code

The code for handling the ancestor logic is in [here](../utils/ancestry_query_handler.ts)

### Ancestors Multiple Queries Example

![alt text](./resolver_tree_ancestry.png 'Retrieve ancestors')

For this example let's assume that the _ancestry array limit_ is 2. The process of interest is A (the entity_id of a node is the character in the circle). Process A has an ancestry array of `[3,2]`, its parent has an ancestry array of `[2,1]` etc. Here is the execution of a request for 3 ancestors for entity_id A.

**Request:** `GET /resolver/A/ancestry?ancestors=3`

1. Retrieve lifecycle events for entity_id `A`
2. Retrieve `A`'s start event's ancestry array
   1. In the event that the node of interest does not have an ancestry array, the entity id of it's parent will be used, essentially an ancestry array of length 1, [3] in the example here
3. `A`'s ancestry array is `[3,2]`, query for the lifecycle events for processes with `entity_id` 3 or 2
4. Check to see if we have retrieved enough ancestors to fulfill the request (we have not, we only received 2 nodes of the 3 that were requested)
5. We haven't so use the most distant ancestor in our result set (process 2)
6. Use process 2's ancestry array to query for the next set of results to fulfill the request
7. Process 2's ancestry array is `[1]` so repeat the process in steps 3-4 and retrieve process with entity_id 1. This fulfills the request so we can return the results for the lifecycle events of A, 3, 2, and 1.

If process 2 had an ancestry array of `[1,0]` we know that we only need 1 more process to fulfill the request so we can truncate the array to `[1]` instead of searching for all the entries in the array.

More generically: In the event where our request stops at the x (non-final) position in an ancestry array, we won't search all items in the array, just those up to the x position. The next-cursor will be set to the last ancestor received since there might be more data.

The `nextAncestor` cursor will be set to `1` in this scenario because we retrieved all 3 ancestors from ES but we don't know if ES has anymore.

## Descendants

We can also leverage the ancestry array to query for the descendants of a process. The basic query for the descendants of a process is: _find all processes where their ancestry array contains a particular entity_id_. The results of this query will be sorted in ascending order by the timestamp field. I will try to outline a couple different scenarios for retrieving descendants using the ancestry array below.

### Start events vs all lifecycle events

There are two parts to querying for descendant process nodes. When a request comes in for 7 process nodes we need to communicate to ES that we want all of the lifecycle nodes for 7 processes. We could use a query that retrieves all lifecycle events (start, end, etc) but the issue with this is that we need to indicate a `size` in our ES query. If we set the `size` to 7, we will only get 7 lifecycle events. These events could be start, end, or already_running events. It doesn't guarantee that we get all of the lifecycle events for 7 process nodes.

Instead we can first query for 7 start events, which guarantees that we will have 7 unique process descendants and then we can gather all those entity_ids and do another query for all the lifecycle events for those 7 processes. The downside here is that you have to do two queries to retrieve all the lifecycle events. Optimizations can be made for the first query for the start events by reducing the `_source` that ES returns to only include the `entity_id` and `ancestry`. This will reduce the amount of data that ES has to send back and speed up the query.

### Scenario Background

In the scenarios below let's assume the _ancestry array limit_ is 2. The times next to the nodes are the time the node was spawned. The value in red indicates that the process terminated at the time in red.

Let's also ignore the fact that retrieving the lifecycle events for a descendant actually takes two queries. Let's assume that it's taken care of, and when we say "query for lifecycle events" we get all the lifecycle events back for the descendants using the algorithm described in the [previous section](#start-events-vs-all-lifecycle-events)

### Simple Scenario

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> E -> F -> G -> H.

![alt text](./resolver_tree_children_simple.png 'Descendants Simple Scenario')

**Request:** `GET /resolver/A/children?children=6`

For this scenario we will retrieve all the lifecycle events for 6 descendants of the process with entity_id `A`. As shown in the diagram above ES has 6 descendants for A so the response to this request will be: `[B, C, E, F, G, H]` because the results are sorted in ascending ordering based on the `timestamp` field which is when the process was started.

### Looping Scenario

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> E -> F -> G -> J -> K -> H.

![alt text](./resolver_tree_children_loop.png 'Descendants Looping Scenario')

**Request:** `GET /resolver/A/children?children=9`

In this scenario the request is for more descendants than can be retrieved using a single querying with the entity_id `A`. This is because the ancestry array for the descendants in the red section do not have `A` in their ancestry array. So when we query for all process nodes that have `A` in their ancestry array we won't receive D, J, or K.

Like in the previous scenario, for the first query we will receive `[B, C, E, F, G, H]`. What we want to do next is use a subset of that response that will get us 3 more descendants to fulfill the request for a total of 9.

We _could_ use `B` and `G` to do this (mostly `B`) but the problem is that when we query for descendants that have `B` or `G` in their ancestry array we will get back some duplicates that we have already received before. For example if we use `B` and `G` we'd get `[C, D, E, F, J, K, H]` but this isn't efficient because we have already received `[E, F, G, H]` from the previous query.

What we want to do is use the most distant descendants from `A` to make the next query to retrieve the last 3 process nodes to fulfill the request. Those would be `[C, E, F, H]`. So our next query will be: _find all process nodes where their ancestry array contains C or E or F or H_. This query can be limited to a size of 3 so that we will only receive `[D, J, K]`.

We have now received all the nodes for the request and we can return the results as `[B, C, E, F, G, H, D, J, K]`.

### Important Caveats

#### Ordering

In the previous example the final results are not sorted based on timestamp in ascending order. This is because we had to perform multiple queries to retrieve all the results. The backend will not return the results in sorted order.

#### Tie breaks on timestamp

In the previous example we saw that J and K had the same timestamp of `12:13 pm`. The reason they were returned in the order `[J, K]` is because the `event.id` field is used to break ties like this. The `event.id` field is unique for a particular event and an increasing value per ECS's guidelines. Therefore J comes before K because it has an `event.id` of 1 vs 2.

#### Finding the most distant descendants

In the previous scenario we saw that we needed to use the most distant descendants from a particular node. To determine if a node is a most distant descendant we can use the ancestry array. Nodes C, E, F, and H all have `A` as their last entry in the ancestry array. This indicates that they are a distant descendant that should be used in the next query. There's one problem with this approach. In a mostly impossible scenario where the node of interest (A) does not have any ancestors, its direct children will also have `A` as the last entry in their ancestry array.

This edge case will likely never be encountered but we'll try to solve it anyway. To get around this as we iterate over the results from our first query (`[B, C, E, F, G, H]`) we can bucket the ones that have `A` as the last entry in their ancestry array. We bucket the results based on the length of their ancestry array (basically a `Map<number, Set<string>>`). So after bucketing our results will look like:

```javascript
{
  1: [B, G]
  2: [C, E, F, H]
}
```

While we are iterating we also keep track of the largest ancestry array that we have seen. In our scenario that will be a size of 2. Then to determine the distant descendants we simply get the nodes that had the largest ancestry array length. In this scenario that'd be `[C, E, F, H]`.

### Handling Pagination

#### Pagination Cursor Values

There are 3 possible states for the pagination cursor for a child node and 2 possible states for the pagination cursor for the node of interest (the node that we are using in the API request).

Potential cursors for the node of interest:
**a string cursor:** a cursor that can be used to skip the previous set of results. The cursor is a base64 version of a json object with `event.id` and `timestamp` of the last process's start event that was received.
**null:** indicates that no more results can be received using this process's entity_id

Potential cursors for descendants of the node of interest (these apply to the results of a request):
**a string cursor:** a cursor that can be used to skip the previous set of results. The cursor is a base64 version of a json object with `event.id` and `timestamp` of the last process's start event that was received. This cursor should be used in conjunction with using this process's entity_id for a query.
**undefined:** the node may contain additional children, but we are not aware. To find out, perform additional queries on the node of interest that original returned these results or move down the tree to a descendant of this node to query for more descendants.
**null:** We have found all possible direct children for this node. There may be more descendants but not direct children for this node.

#### Pagination Examples

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> G -> F -> H -> E -> J -> K.

![alt text](./resolver_tree_children_pagination.png 'Descendants Pagination Scenario')

Handling pagination for the children API in a little tricky. Let's consider this scenario:

**Request:** `GET /resolver/A/children?children=3`

Let's use the diagram above to show the relationship between processes and the data in ES. The response for the request for 3 children is `[B, C, G]`. More process nodes exist in ES so it would be helpful to indicate in the response that there is more data and a way to skip `[B, C, G]` to get the next set of data. A cursor can be set on the response for `A` to point to the last process node in the response which can be sent in another request to retrieve the next set of data. This cursor will contain information from `G` because it has the latest timestamp (in ascending order).

If another request was made using the returned cursor like the following:

**Request:** `GET /resolver/A/children?children=5&after=<cursor from previous request>`

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> G -> F -> H -> E -> J -> K (the same as above).

![alt text](./resolver_tree_children_pagination_with_after.png 'Descendants Pagination Scenario Part 2')

For this request we will do a query for _find all process nodes where their ancestry array has entity_id `A` and use the cursor to skip old results_. The response for this request is `[F, H, E, K]`. The request actually asked for 5 nodes but there was only 4 in ES so only 4 were returned.

The odd thing about this response is that it did not receive D and J. The problem is that the backend does not have any concept of C in this second request because it was received in the previous one. It will be skipped based on the pagination cursor returned previously.

This example highlights a scenario where it is not easy for the backend to go back and continue to get the descendants for C because of the limitation of the ancestry array.

#### Pagination cursor for descendant nodes

Let's go back to the first request where we got `[B, C, G]`. How could we go about getting the rest of the children for `B`? We have two ways of solving this. First we could determine what the last descendant we had received of `B` and use that as the cursor when returning all the results for this request. That is actually kind of difficult.

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> G -> F -> H -> E -> J -> K (the same as above).

![alt text](./resolver_tree_children_pagination.png 'Descendants Pagination Scenario')

Let's imagine for a moment that the _ancestry array limit_ is 3 instead of 2. Taking our previous request we would instead get `[B, C, D]` because D started before G. In this case the last descendant for `B` is actually `D` and not `C`. This gets complicated because we'd have to keep track of which descendant was the last (time wise) one for each intermediate process node. In this example we'd need to find the last descendant for both `B` and `C`. We'd have to track the descendants for each process node and build a map to quickly be able to retrieve the last descendant.

Instead of doing that we could also continue to get the immediate children of `B` by doing another request for `A` like was shown in previous example when using the after cursor. This would guarantee that all children (first level descendants of a node) had been retrieved.

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> G -> F -> H -> E -> J -> K (the same as above).

![alt text](./resolver_tree_children_pagination_with_after.png 'Descendants Pagination Scenario Part 2')

To get to the response shown in the diagram above (the blue nodes is the response) a request was made for 3 nodes which returned `[B, C, D]` and then another request was made using the returned cursor for `A` to get an additional 4 nodes `[F, H, E, K]`. Let's assume that the request looked like:

**Request:** `GET /resolver/A/children?children=5&after=<cursor from previous request>`

So 5 nodes were actually asked for. After `[F, H, E]` are returned during the first query to ES, we will use the most distant children (also `[F, H, E]`) and make another request for any nodes that have F or H or E in their ancestry array. Only a single node satisfies that query which returns `K`. Therefore we can know with certainty that E, F, and H have no more children because ES only returned K instead of K and one more node (since we requested a total of 5). With this knowledge we can mark A, E, F, H's pagination cursors in a way to communicate that they have no more descendants.

The way the backend communicates this is by marking the cursor as null.

If the request was actually for only 4 children like:

**Request:** `GET /resolver/A/children?children=4&after=<cursor from previous request>`

Then we wouldn't know for sure whether ES had more results than K. But what we can know is that `A` does not have any more descendants that we can retrieve in a single query using its ancestry array. We have received all nodes where `A` is in their ancestry array when we made the second query for nodes E, F, and H and received `K`. Therefore at the moment when we received `[F, H, E]` we can mark `A`'s cursor as null.

When we make the next query for any nodes that have F or H or E in their ancestry array and get back K, this satisfies our size of only needing one more node (4 total). At this point we don't know for sure if E, F, or H have more descendants. Since we don't know we will mark E, F, and H's cursors to point to K.

#### Undefined Pagination

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> E -> F -> G -> J -> K -> H. (Not the same as above).

For this scenario let's assume ES has the data in the diagram below. Let's say the request looks like:

**Request:** `GET /resolver/A/children?children=6`

![alt text](./resolver_tree_children_loop.png 'Descendants Looping Scenario')

The result for this request will be `[B, C, E, F, G, H]`. Since the request was looking for 6 nodes and we got that amount the cursor for `A` will be set to the last one: `H`. The cursors for the intermediate nodes `B` and `G` will be undefined. This is because we don't know if `B` or `G` have more children but `A` can be used to determine that. We also don't know if C, E, F, or H have more descendants so their cursor will also be marked as undefined. If we wanted to know if C had more descendants we can simply issue a new request like `GET /resolver/C/children` to get its descendants and we won't receive and duplicates because we never received D, J or K.

If we want to know if `B` has more children we can issue another request using the cursor set for `A`.

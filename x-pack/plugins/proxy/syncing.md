# Client Syncing Strategy

A proposal for dealing with syncing conflicts on the proxy project.

- Version: Draft
- Date: 19/06/2019
- Authors
  - Todd Kennedy

## Abstract

This document to meant to describe a strategy for conflict-free updating of a shared document stored in elasticsearch, allowing for eventual consistency of the shared document across a number of client nodes. Rather than trying to cache the document locally and dealing with concerns over editing a stale local document state (and conflict that will arise from that), we should leverage some of the facilities built into elasticsearch.

## Introduction

The editing of shared documents across multiple sites in real-time is a well-explored part of computer science which has resulted in the establishment of two main protocols for syncing: conflict-free replicated data types (CRDTs) and operational transform (OT). These two protocols are designed to handle real time editing of shared documents and require either peer-to-peer connections or a centralized server to coordinate the changes.

Given the time constraints presented, these protocols are out of reach for this implementation, so we need to design another method to ensure that these clients are able to stay in synchronization with one another and update the shared document in a conflict-free manner.

In general the problem exists because each client needs to grab the latest version of the document from the server, update it locally and then put it back to the server. If the document has been changed in the meantime though, this results in an error on the out-of-sync client.

<pre><code>                                                                               
                                                                               
                           ┌─────────────────┐              ┌─────────────────┐
                           │     Clients     │              │     Server      │
                           └────────┬────────┘              └────────────┬────┘
                                    │                                    │     
                                    │client 1 -> get doc                 │     
                                    ├───────────────────────────────────▶│     
                                    │                                    │     
                                    │      client 1 <- send doc version 1│     
            ┌───────────────────────┼────────────────────────────────────│     
            ▼                       │                                    │     
 ┌────────────────────┐             │ client 2 -> get doc                │     
 │client 1            │             ├───────────────────────────────────▶│     
 │update internal doc │             │                                    │     
 │version 1+X         │             │      client 2 <- send doc version 1│     
 └────────────────────┘┌────────────┼────────────────────────────────────│     
            │          ▼            │                                    │     
            ├────────────────────┐  │                                    │     
            │client 2            │  │client 2 -> update doc version 1+   │     
            ├────────────────────┼──▶───────────────────────────────────▶│     
            │version 1+Y         │  │                                    │     
            ├────────────────────┘  │  client 2 <- accept doc version 1+Y│     
            │                       ◀────────────────────────────────────│     
            │                       │                                    │     
            │                       │                                    │     
            │                       │client 1 -> update doc version 1+X  │     
            └───────────────────────▶───────────────────────────────────▶│     
                                    │                                    │     
                                    │            client 1 <- 409 conflict│     
                                    ◀────────────────────────────────────│     
                                    │                                    │     
                                    │client 1 -> get doc                 │     
                                    ├───────────────────────────────────▶│     
                                    │                                    │     
                                    │    client 1 <- send doc version 1+Y│     
            ┌───────────────────────┼────────────────────────────────────│     
            ▼                       │                                    │     
 ┌────────────────────┐             │ client 2 -> get doc                │     
 │client 1            │             ├───────────────────────────────────▶│     
 │UPDATE CONFLICT!    │             │                                    │     
 │                    │             │    client 2 <- send doc version 1+Y│     
 └────────────────────┘ ┌───────────┼────────────────────────────────────│     
                        ▼           │                                    │     
             ┌────────────────────┐ │                                    │     
             │client 2            │ │                                    │     
             │NOOP                │ │                                    │     
             │version 1+Y         │ │                                    │     
             └────────────────────┘ │                                    │     
                                    │                                    │     
                                    │                                    │     
                                    │                                    │     
                                    │                                    │     
                                    │                                    │     
                                    ▼                                    ▼     
</code></pre>

We could figure out a merge algorithm (first in wins would be appropriate for this use-case), mark the failed client as being out sync, and require it to attempt to update again. Due to the variable number of clients and the time in which processing can take, this scenario could lead us to a dead client (one that is unable to respond because it is never up-to-date), which would also have information locally that it is unable to share.

By dropping the real time requirement of this, we _should_ be able to approximate a consensus on shared state. Alternatively we can implement an on-demand retrieval of cluster routes.

## Real time document retrieval

One of the properties of how this proxy is designed is that there are two separate documents that make up the information we need: the heartbeat (or liveness) document that explains which nodes exist and when the last time they checked in was, and the cluster routing doc that explains which of these nodes is responsible for a given resource.

If we split this combined document into two separate ones, we can see that the routing document recieves much fewer updates, especially with regards to concurrency. If we don't store this document locally, we can utilize the elasticsearch partial update API to add new routing table entries without ever having to know what the entire document looks like, with deletes occurring via `painless` script queries. If there happens to be a conflict, we can ask the client to retry the query, as the lower frequency of updates should help ensure that the change is able to be applied quickly.

The heartbeat doc will receive frequent updates as the notes are required to note that they are available to the system. In this case, the document will be stored locally, but we will still use partial updates to note that a node is available by updating it's unique time. To handle the culling of nodes that have timed out, each node will run a `painless` script query asking elasticsearch to remove entries that haven't been updated since the timeout threshold. This query is bound to conflict, but since it's just dropping nodes that have timed out, we only need one of these updates to succeed at a given time.

Upon proxy request, the routing table will be retrieved from elasticsearch and compared with the liveness table. If the node that is responsible for a given resource is still alive, the request will be made, otherwise an error will be returned

## Sync Order Traversal

_note: this solution has been deprecated in favor of real time document retrieval_

A proposed solution here is to only allow one client to sync at a time, and to run the synchronization list in order, not allowing a resource to be made externally available until all the clients have seen a resource once.

The clients will sync in the order of the oldest synced client going first, with alphabetical order of nodes breaking ties.

<pre><code>                                                                               
    ┌───doc version 0──┐       ┌───doc version 1──┐      ┌───doc version 2──┐  
    │    RESOURCES     │       │    RESOURCES     │      │    RESOURCES     │  
    │******************│       │******************│      │******************│  
    │                  │       │Resource A        │      │Resource A        │  
    │                  │       │- node a          │      │- node a          │  
    │                  │       │- added version 1 │      │- added version 1 │  
    │                  │       │- closed          │      │- closed          │  
    │                  │       │                  │      │                  │  
    │      NODES       │       │      NODES       │      │      NODES       │  
    │******************│       │******************│      │******************│  
    │    node a        │       │    node b        │      │    node c        │  
    │  - version 0     │       │  - version 0     │      │  - version 0     │  
    │    node b        │       │    node c        │      │    node a        │  
    │  - version 0     │       │  - version 0     │      │  - version 1     │  
    │    node c        │       │    node a        │      │    node b        │  
    │  - version 0     │       │  - version 1     │      │  - version 2     │  
    │                  │       │                  │      │                  │  
    └──────────────────┘       └──────────────────┘      └──────────────────┘  
                                                                               
                                                                               
    ┌───doc version 3──┐                                                       
    │    RESOURCES     │                                                       
    │******************│                                                       
    │Resource A        │                                                       
    │- node a          │                                                       
    │- added version 1 │                                                       
    │- open            │                                                       
    │                  │                                                       
    │      NODES       │                                                       
    │******************│                                                       
    │    node a        │                                                       
    │  - version 1     │                                                       
    │    node b        │                                                       
    │  - version 2     │                                                       
    │    node c        │                                                       
    │  - version 3     │                                                       
    │                  │                                                       
    └──────────────────┘                                                       
  </code></pre>

In this example, `Node A` adds `Resource A` and generates version 1. It then moves itself to the end of the sync order. `Node B` has no updates to the resources, but updates that it now knows about `version 1` (and moves itself), then `Node C` updates to say that it has no new resources, but it now is on `version 3` (and moves itself, making `Node A` the oldest and top-most client). Since the oldest client version is >= the version the resource was added in, all of the proxies are able to route data to this resource.

Until this happens, clients will not be able to route to these resources to prevent clients from having inconsistent results where some nodes are able to proxy resources but some nodes are not able to.

Conflicts are handled by a `first-in wins` strategy -- if a later node also attempts to mark itself as being responsible for a resource, it will lose, and update its routing table to point to the existing node.

### Initialization handshake

When the system starts for the first time, all the nodes in the system will attempt to connect and initialize the system by updating the document adding themselves. This will either result in a successful update, or a conflict. Upon conflict, the node will stop trying to update the document, and then follow the adding a new node strategy.

### Adding a new node

When a new node wants to connect, it will get the document from the server and send a message to the oldest node on the list asking it to include it in the document, and then iterate on pulling down the document. When the node appears in the document it means that the node is now ready to be used.

### Issues

- The amount of time it takes for a resource to be made available is the `updateInterval * n` where `n` is the number of clients. We can make the `updateInterval` smaller and allow clients to check more frequently, but with large numbers of nodes in a cluster this will cause delay before making a resource available for routing purposes.
- Processing the document from elasticsearch will take longer as we will have to check the validity of resources against the lowest document version available.

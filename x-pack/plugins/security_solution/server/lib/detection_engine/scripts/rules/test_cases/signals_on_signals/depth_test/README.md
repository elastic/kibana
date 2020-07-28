This is a depth test which allows users and UI's to create "funnels" of information. You can funnel your data into smaller
and smaller data sets using this. For example, you might have 1,000k of events but generate only 100k of signals off
of those events. However, you then want to generate signals on top of signals that are only 10k. Likewise you might want
signals on top of signals on top of signals to generate only 1k.

```
events from indexes might be 1,000k (no depth)
signals -> events would be less such as 100k
signals -> signals -> events would be even less (such as 10k)
signals -> signals -> events would be even less (such as 1k)
```

This folder contains a rule called

```sh
query_single_id.json
```

which will write a single signal document into the signals index by searching for a single document `"query": "_id: o8G7vm8BvLT8jmu5B1-M"` . Then another rule called

```sh
signal_on_signal_depth_1.json
```

which has this key part of its query: `"query": "signal.parent.depth: 1 and _id: *"` which will only create signals
from all signals that point directly to an event (signal -> event).

Then a second rule called

```sh
signal_on_signal_depth_2.json
```

which will only create signals from all signals that point directly to another signal (signal -> signal) with this query

```json
"query": "signal.parent.depth: 2 and _id: *"
```

## Setup

You should first get a valid `_id` from the system from the last 24 hours by running any query within timeline
or in the system and copying its `_id`. Once you have that `_id` add it to `query_single_id.json`. For example if you have found an `_id`
in the last 24 hours of `sQevtW8BvLT8jmu5l0TA` add it to `query_single_id.json` under the key `query` like so:

```json
"query": "_id: sQevtW8BvLT8jmu5l0TA",
```

Then get your current signal index:

```json
./get_signal_index.sh
{
  "name": ".siem-signals-default"
}
```

And edit the `signal_on_signal.json` and add that index to the key of `index` so we are running that rule against the signals index:

```json
"index": ".siem-signals-default"
```

Next you want to clear out all of your signals and all rules:

```sh
./hard_reset.sh
```

Finally, insert and start the first the query like so:

```sh
./post_rule.sh ./rules/test_cases/signals_on_signals/depth_test/query_single_id.json
```

Wait 30+ seconds to ensure that the single record shows up in your signals index. You can use dev tools in Kibana
to see this by first getting your configured signals index by running:

```ts
./get_signal_index.sh
{
  "name": ".siem-signals-default"
}
```

And then you can query against that:

```ts
GET .siem-signals-default/_search
```

Check your parent section of the signal and you will see something like this:

```json
"parent" : {
  "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
  "id" : "o8G7vm8BvLT8jmu5B1-M",
  "type" : "event",
  "index" : "filebeat-8.0.0-2019.12.18-000001",
  "depth" : 1
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  }
]
```

The parent and ancestors structure is defined as:

```
rule -> The id of the rule. You can view the rule by ./get_rule_by_rule_id.sh ded57b36-9c4e-4ee4-805d-be4e92033e41
id -> The original _id of the document
type -> The type of the document, it will be either event or signal
index -> The original location of the index
depth -> The depth of this signal. It will be at least 1 to indicate it is a signal generated from a event. Otherwise 2 or more to indicate a signal on signal and what depth we are at
ancestors -> An array tracking all of the parents of this particular signal. As depth increases this will too.
```

This is indicating that you have a single parent of an event from the signal (signal -> event) and this document has a single
ancestor of that event. Each 30 seconds that goes it will use de-duplication technique to ensure that this signal is not re-inserted. If after
each 30 seconds you DO SEE multiple signals then the bug is a de-duplication bug and a critical bug. If you ever see a duplicate rule in the
ancestors array then that is another CRITICAL bug which needs to be fixed.

After this is ensured, the next step is to run a single signal on top of a signal by posting once

```sh
./post_rule.sh ./rules/test_cases/signals_on_signals/depth_test/signal_on_signal_depth_1.json
```

Notice in `signal_on_signal_depth_1.json` we do NOT have a `rule_id` set. This is intentional and is to make it so we can test N rules
running in the system which are generating signals on top of signals. After 30 seconds have gone by you should see that you now have two
documents in the signals index. The first signal is our original (signal -> event) document with a rule id:

```json
"parent" : {
  "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
  "id" : "o8G7vm8BvLT8jmu5B1-M",
  "type" : "event",
  "index" : "filebeat-8.0.0-2019.12.18-000001",
  "depth" : 1
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  }
]
```

and the second document is a signal on top of a signal like so:

```json
"parent" : {
  "rule" : "1d3b3735-66ef-4e53-b7f5-4340026cc40c",
  "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 2
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "1d3b3735-66ef-4e53-b7f5-4340026cc40c",
    "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  }
]
```

Notice that the depth indicates it is at level 2 and its parent is that of a signal. Also notice that the ancestors is an array of size 2
indicating that this signal terminates at an event. Each and every signal ancestors array should terminate at an event and should ONLY contain 1
event and NEVER 2 or more events. After 30+ seconds you should NOT see any new documents being created and you should be stable
at 2. Otherwise we have AND/OR a de-duplication issue, signal on signal issue.

Now, post this same rule a second time as a second instance which is going to run against these two documents.

```sh
./post_rule.sh ./rules/test_cases/signals_on_signals/depth_test/signal_on_signal_depth_1.json
```

If you were to look at the number of rules you have:

```sh
./find_rules.sh
```

You should see that you have 3 rules running concurrently at this point. Write down the `id` to keep track of them

- 1 event rule which is always finding the same event continuously (id: 74e0dd0c-4609-416f-b65e-90f8b2564612)
- 1 signal rule which is finding ALL signals at depth 1 (id: 1d3b3735-66ef-4e53-b7f5-4340026cc40c)
- 1 signal rule which is finding ALL signals at depth 1 (id: c93ddb57-e7e9-4973-9886-72ddefb4d22e)

The expected behavior is that eventually you will get 3 total documents but not additional ones after 1+ minutes. These will be:

The original event rule 74e0dd0c-4609-416f-b65e-90f8b2564612 (event -> signal)

```json
"parent" : {
  "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
  "id" : "o8G7vm8BvLT8jmu5B1-M",
  "type" : "event",
  "index" : "filebeat-8.0.0-2019.12.18-000001",
  "depth" : 1
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  }
]
```

The first signal to signal rule 1d3b3735-66ef-4e53-b7f5-4340026cc40c (signal -> event)

```json
"parent" : {
  "rule" : "1d3b3735-66ef-4e53-b7f5-4340026cc40c",
  "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 2
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "1d3b3735-66ef-4e53-b7f5-4340026cc40c",
    "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  }
]
```

Then our second signal to signal rule c93ddb57-e7e9-4973-9886-72ddefb4d22e (signal -> event) which finds the same thing as the first
signal to signal

```json
"parent" : {
  "rule" : "c93ddb57-e7e9-4973-9886-72ddefb4d22e",
  "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 2
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "c93ddb57-e7e9-4973-9886-72ddefb4d22e",
    "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  }
]
```

We should be able to post this depth level as many times as we want and get only 1 new document each time. If we decide though to
post `signal_on_signal_depth_2.json` like so:

```sh
./post_rule.sh ./rules/test_cases/signals_on_signals/depth_test/signal_on_signal_depth_2.json
```

The expectation is that a document for each of the previous depth 1 documents would be produced. Since we have 2 instances of
depth 1 rules running then the signals at depth 2 will produce two new ones and those two will look like so:

```json
"parent" : {
  "rule" : "a1f7b520-5bfd-451d-af59-428f60753fee",
  "id" : "365236ce5e77770508152403b4e16613f407ae4b1a135a450dcfec427f2a3231",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 3
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "1d3b3735-66ef-4e53-b7f5-4340026cc40c",
    "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  },
  {
    "rule" : "a1f7b520-5bfd-451d-af59-428f60753fee",
    "id" : "365236ce5e77770508152403b4e16613f407ae4b1a135a450dcfec427f2a3231",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 3
  }
]
```

```json
"parent" : {
  "rule" : "a1f7b520-5bfd-451d-af59-428f60753fee",
  "id" : "e8b1f1adb40fd642fa524dea89ef94232e67b05e99fb0b2683f1e47e90b759fb",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 3
},
"ancestors" : [
  {
    "rule" : "74e0dd0c-4609-416f-b65e-90f8b2564612",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "c93ddb57-e7e9-4973-9886-72ddefb4d22e",
    "id" : "4cc69c1cbecdd2ace4075fd1d8a5c28e7d46e4bf31aecc8d2da39252c50c96b4",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  },
  {
    "rule" : "a1f7b520-5bfd-451d-af59-428f60753fee",
    "id" : "e8b1f1adb40fd642fa524dea89ef94232e67b05e99fb0b2683f1e47e90b759fb",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 3
  }
]
```

The total number of documents should be 5 at this point. If you were to post this same rule a second time to get a second instance
running you will end up with 7 documents as it will only re-report the first 2 and not interfere with the other rules.

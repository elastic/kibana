This test is to ensure that signals will "halt" eventually when they are run against themselves. This isn't how anyone should setup
signals on signals but rather how we will eventually "halt" given the worst case situations where users are running signals on top of signals
that are duplicates of each other and going very far back in time.

It contains a rule called

```sh
query_single_id.json
```

which will write a single signal document into the signals index by searching for a single document `"query": "_id: o8G7vm8BvLT8jmu5B1-M"` . Then another rule called

```sh
signal_on_signal.json
```

which will always generate a signal for EVERY single document it sees `"query": "_id: *"`

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
./post_rule.sh ./rules/test_cases/signals_on_signals/halting_test/query_single_id.json
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
  "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
  "id" : "o8G7vm8BvLT8jmu5B1-M",
  "type" : "event",
  "index" : "filebeat-8.0.0-2019.12.18-000001",
  "depth" : 1
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
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
./post_rule.sh ./rules/test_cases/signals_on_signals/halting_test/signal_on_signal.json
```

Notice in `signal_on_signal.json` we do NOT have a `rule_id` set. This is intentional and is to make it so we can test N rules
running in the system which are generating signals on top of signals. After 30 seconds have gone by you should see that you now have two
documents in the signals index. The first signal is our original (signal -> event) document with a rule id:

(signal -> event)

```json
"parent" : {
  "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
  "id" : "o8G7vm8BvLT8jmu5B1-M",
  "type" : "event",
  "index" : "filebeat-8.0.0-2019.12.18-000001",
  "depth" : 1
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  }
]
```

and the second document is a signal on top of a signal like so:

(signal -> signal -> event)

```json
"parent" : {
  "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
  "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 2
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
    "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
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

Now, post a second signal that is going to run against these two documents.

```sh
./post_rule.sh ./rules/test_cases/signals_on_signals/halting_test/signal_on_signal.json
```

If you were to look at the number of rules you have:

```sh
./find_rules.sh
```

You should see that you have 3 rules running concurrently at this point. Write down the `id` to keep track of them

- 1 event rule which is always finding the same event continuously (id: ded57b36-9c4e-4ee4-805d-be4e92033e41)
- 1 signal rule which is finding ALL signals (id: 161fa5b8-0b96-4985-b066-0d99b2bcb904)
- 1 signal rule which is finding ALL signals (id: f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406)

The expected behavior is that eventually you will get 5 total documents but not additional ones after 1+ minutes. These will be:

The original event rule ded57b36-9c4e-4ee4-805d-be4e92033e41 (event -> signal)

```json
"parent" : {
  "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
  "id" : "o8G7vm8BvLT8jmu5B1-M",
  "type" : "event",
  "index" : "filebeat-8.0.0-2019.12.18-000001",
  "depth" : 1
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  }
]
```

The first signal to signal rule 161fa5b8-0b96-4985-b066-0d99b2bcb904 (signal -> event)

```json
"parent" : {
  "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
  "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 2
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
    "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  }
]
```

Then our second signal to signal rule f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406 (signal -> event) which finds the same thing as the first
signal to signal

```json
"parent" : {
  "rule" : "f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406",
  "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 2
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406",
    "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  }
]
```

But then f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406 also finds the first signal to signal rule from 161fa5b8-0b96-4985-b066-0d99b2bcb904
and writes that document out with a depth of 3. (signal -> signal -> event)

```json
"parent" : {
  "rule" : "f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406",
  "id" : "c627e5e2576f1b10952c6c57249947e89b6153b763a59fb9e391d0b56be8e7fe",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 3
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
    "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  },
  {
    "rule" : "f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406",
    "id" : "c627e5e2576f1b10952c6c57249947e89b6153b763a59fb9e391d0b56be8e7fe",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 3
  }
]
```

Since it wrote that document, the first signal to signal 161fa5b8-0b96-4985-b066-0d99b2bcb904 writes out it found this newly created signal
(signal -> signal -> event)

```json
"parent" : {
  "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
  "id" : "efbe514e8d806a5ef3da7658cfa73961e25befefc84f622e963b45dcac798868",
  "type" : "signal",
  "index" : ".siem-signals-default-000001",
  "depth" : 3
},
"ancestors" : [
  {
    "rule" : "ded57b36-9c4e-4ee4-805d-be4e92033e41",
    "id" : "o8G7vm8BvLT8jmu5B1-M",
    "type" : "event",
    "index" : "filebeat-8.0.0-2019.12.18-000001",
    "depth" : 1
  },
  {
    "rule" : "f2b70c4a-4d8f-4db5-9ed7-d3ab0630e406",
    "id" : "9d8710925adbf1a9c469621805407e74334dd08ca2c2ea414840fe971a571938",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 2
  },
  {
    "rule" : "161fa5b8-0b96-4985-b066-0d99b2bcb904",
    "id" : "efbe514e8d806a5ef3da7658cfa73961e25befefc84f622e963b45dcac798868",
    "type" : "signal",
    "index" : ".siem-signals-default-000001",
    "depth" : 3
  }
]
```

You will be "halted" at this point as the signal ancestry and de-duplication ensures that we do not report twice on signals and that we do not
create additional duplications. So what happens if we create a 3rd rule which does a signal on a signal?

```sh
./post_rule.sh ./rules/test_cases/signals_on_signals/halting_test/signal_on_signal.json
```

That 3rd signal should find all previous 5 signals and write them out. So that's 5 more. Then each signal will report on those 5 giving a depth of
4 . Grand total will be 16. You can repeat this as many times as you want and should always see an eventual constant stop time of the signals. They should
never keep increasing for this test.

What about ordering the adding of rules between the query of the document and the signals? This order should not matter and you should get the same
results regardless of if you add the signals -> signals rules first or the query a signal event document first. The same number of documents should also
be outputted.

Why does it take sometimes several minutes before things become stable? This is because a rule can write a signal back to the index, then another rule
wakes up and writes its document, and the previous rules on next run see this one and creates another chain. This continues until the ancestor detection
part of the code realizes that it is going to create a cyclic if it adds the same rule a second time and you no longer have a DAG (Directed Acyclic Graph)
at which point it terminates.

What would happen if I changed the rule look-back from `"from": "now-1d"` to something smaller such as `"from": "now-30s"`? Then you won't get the same
number potentially and things are indeterministic because depending on when your rule runs it might find a previous signal and it might not. This is ok
and normal as you are then running signals on signals at the same interval as each other and the rules at the moment. A signal on a signal does not detect
that another signal has written something and it needs to re-run within the same scheduled time period. It also does not detect that another rule has just
written something and does not re-schedule its self to re-run again or against that document.

How do I then solve the ordering problem event and signal rules writing at the same time? See the `depth_test` folder for more tests around that but you
have a few options. You can run your event rules at 5 minute intervals + 5 minute look back, then your signals rule at a 10 minute interval + 10 minute look
back which will cause it to check the latest run and the previous run for signals to signals depth of 2. For expected signals that should operate at a depth
of 3, you would increase it by another 10 minute look back for a 20 minute interval + 20 minute look back. For level 4, you would increase that to 40 minute
look back and adjust your queries accordingly to check the depth for more efficiency in querying. See `depth_test` for more information.

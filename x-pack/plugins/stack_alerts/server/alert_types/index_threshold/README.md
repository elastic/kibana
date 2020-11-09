# built-in alertType index threshold

directory in plugin: `server/alert_types/index_threshold`

The index threshold alert type is designed to run an ES query over indices,
aggregating field values from documents, comparing them to threshold values,
and scheduling actions to run when the thresholds are met.

And example would be checking a monitoring index for percent cpu usage field
values that are greater than some threshold, which could then be used to invoke
an action (email, slack, etc) to notify interested parties when the threshold
is exceeded.

## alertType `.index-threshold`

The alertType parameters are specified in [`alert_type_params.ts`][it-alert-params].

The alertType has a single actionGroup, `'threshold met'`.  The `context` object
provided to actions is specified in
[`action_context.ts`][it-alert-context].

[it-alert-params]: alert_type_params.ts
[it-alert-context]: action_context.ts
[it-core-query]: lib/core_query_types.ts

### example

This example uses [kbn-action][]'s `kbn-alert` command to create the alert,
and [es-hb-sim][] to generate ES documents for the alert to run queries
against.

Start `es-hb-sim`:

```
es-hb-sim 1 es-hb-sim host-A https://elastic:changeme@localhost:9200
```

This will start indexing documents of the following form, to the `es-hb-sim`
index:

```
{"@timestamp":"2020-02-20T22:10:30.011Z","summary":{"up":1,"down":0},"monitor":{"status":"up","name":"host-A"}}
```

Press `u` to have it start writing "down" documents instead of "up" documents.

Create a server log action that we can use with the alert:

```
export ACTION_ID=`kbn-action create .server-log 'server-log' '{}' '{}' | jq -r '.id'`
```

Finally, create the alert:

```
kbn-alert create .index-threshold 'es-hb-sim threshold' 1s \
  '{
    index:                es-hb-sim
    timeField:            @timestamp
    aggType:              avg
    aggField:             summary.up
    groupBy:              top
    termSize:             100
    termField:            monitor.name.keyword
    timeWindowSize:       5
    timeWindowUnit:       s
    thresholdComparator:  <
    threshold:            [ 0.6 ]
  }' \
  "[
     {
       group:     threshold met
       id:        '$ACTION_ID'
       params: {
         level:   warn
         message: '{{{context.message}}}'
       }
     }
   ]"
```

This alert will run a query over the `es-hb-sim` index, using the `@timestamp`
field as the date field, aggregating over groups of the field value
`monitor.name.keyword` (the top 100 groups), then aggregating those values
using an `average` aggregation over the `summary.up` field.  If we ran
another instance of `es-hb-sim`, using `host-B` instead of `host-A`, then the
alert will end up potentially scheduling actions for both, independently.
Within the alerting plugin, this grouping is also referred to as "instanceIds"
(`host-A` and `host-B` being distinct instanceIds, which can have actions
scheduled against them independently).

The time window is set to 5 seconds.  That means, every time the
alert runs it's queries (every second, in the example above), it will run it's
ES query over the last 5 seconds.  Thus, the queries, over time, will overlap.
Sometimes that's what you want.  Other times, maybe you just want to do 
sampling, running an alert every hour, with a 5 minute window.  Up to the you!

Using the `thresholdComparator` `<` and `threshold` `[0.6]`, the alert will 
calculate the average of all the `summary.up` fields for each unique
`monitor.name.keyword`, and then if the value is less than 0.6, it will
schedule the specified action (server log) to run.  The `message` param
passed to the action includes a mustache template for the context variable
`message`, which is created by the alert type.  That message generates
a generic but useful text message, already constructed.  Alternatively,
a customer could set the `message` param in the action to a much more
complex message, using other context variables made available by the
alert type.

Here's the message you should see in the Kibana console, if everything is
working:

```
server    log   [17:32:10.060] [warning][actions][actions][plugins] \
   Server log: alert es-hb-sim threshold group host-A value 0 \
   exceeded threshold avg(summary.up) < 0.6 over 5s \
   on 2020-02-20T22:32:07.000Z
```
[kbn-action]: https://github.com/pmuellr/kbn-action
[es-hb-sim]: https://github.com/pmuellr/es-hb-sim
[now-iso]: https://github.com/pmuellr/now-iso


## Data Apis via the TriggersActionsUi plugin and its http endpoints

The Index Threshold Alert Type is backed by Apis exposed by the [TriggersActionsUi plugin](../../../../triggers_actions_ui/README.md).

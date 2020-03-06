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

The alertType parameters are specified in
[`lib/core_query_types.ts`][it-core-query]
and
[`alert_type_params.ts`][it-alert-params].

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


## http endpoints

An HTTP endpoint is provided to return the values the alertType would calculate,
over a series of time.  This is intended to be used in the alerting UI to 
provide a "preview" of the alert during creation/editing based on recent data,
and could be used to show a "simulation" of the the alert over an arbitrary
range of time.

The endpoint is `POST /api/alerting_builtins/index_threshold/_time_series_query`.
The request and response bodies are specifed in 
[`lib/core_query_types.ts`][it-core-query]
and
[`lib/time_series_types.ts`][it-timeSeries-types].
The request body is very similar to the alertType's parameters.

### example

Continuing with the example above, here's a query to get the values calculated
for the last 10 seconds.
This example uses [now-iso][] to generate iso date strings.

```console
curl -k  "https://elastic:changeme@localhost:5601/api/alerting_builtins/index_threshold/_time_series_query" \
    -H "kbn-xsrf: foo" -H "content-type: application/json"   -d "{
    \"index\":           \"es-hb-sim\",
    \"timeField\":       \"@timestamp\",
    \"aggType\":         \"avg\",
    \"aggField\":        \"summary.up\",
    \"groupBy\":         \"top\",
    \"termSize\":        100,
    \"termField\":       \"monitor.name.keyword\",
    \"interval\":        \"1s\",
    \"dateStart\":       \"`now-iso -10s`\",
    \"dateEnd\":         \"`now-iso`\",
    \"timeWindowSize\":  5,
    \"timeWindowUnit\":  \"s\"
}"
```

```
{
  "results": [
    {
      "group": "host-A",
      "metrics": [
        [ "2020-02-26T15:10:40.000Z", 0 ],
        [ "2020-02-26T15:10:41.000Z", 0 ],
        [ "2020-02-26T15:10:42.000Z", 0 ],
        [ "2020-02-26T15:10:43.000Z", 0 ],
        [ "2020-02-26T15:10:44.000Z", 0 ],
        [ "2020-02-26T15:10:45.000Z", 0 ],
        [ "2020-02-26T15:10:46.000Z", 0 ],
        [ "2020-02-26T15:10:47.000Z", 0 ],
        [ "2020-02-26T15:10:48.000Z", 0 ],
        [ "2020-02-26T15:10:49.000Z", 0 ],
        [ "2020-02-26T15:10:50.000Z", 0 ]
      ]
    }
  ]
}
```

To get the current value of the calculated metric, you can leave off the date:

```
curl -k  "https://elastic:changeme@localhost:5601/api/alerting_builtins/index_threshold/_time_series_query" \
    -H "kbn-xsrf: foo" -H "content-type: application/json"   -d '{
    "index":           "es-hb-sim",
    "timeField":       "@timestamp",
    "aggType":         "avg",
    "aggField":        "summary.up",
    "groupBy":         "top",
    "termField":       "monitor.name.keyword",
    "termSize":        100,
    "interval":        "1s",
    "timeWindowSize":  5,
    "timeWindowUnit":  "s"
}'
```

```
{
  "results": [
    {
      "group": "host-A",
      "metrics": [
        [ "2020-02-26T15:23:36.635Z", 0 ]
      ]
    }
  ]
}
```

[it-timeSeries-types]: lib/time_series_types.ts

## service functions

A single service function is available that provides the functionality
of the http endpoint `POST /api/alerting_builtins/index_threshold/_time_series_query`,
but as an API for Kibana plugins.  The function is available as
`alertingService.indexThreshold.timeSeriesQuery()`

The parameters and return value for the function are the same as for the HTTP
request, though some additional parameters are required (logger, callCluster,
etc).

## notes on the timeSeriesQuery API / http endpoint

This API provides additional parameters beyond what the alertType itself uses:

- `dateStart`
- `dateEnd`
- `interval`

The `dateStart` and `dateEnd` parameters are ISO date strings.

The `interval` parameter is intended to model the `interval` the alert is
currently using, and uses the same `1s`, `2m`, `3h`, etc format.  Over the
supplied date range, a time-series data point will be calculated every
`interval` duration.

So the number of time-series points in the output of the API should be:

```
( dateStart - dateEnd ) / interval
```

Example: 

```
dateStart: '2020-01-01T00:00:00'
dateEnd:   '2020-01-02T00:00:00'
interval:  '1h'
```

The date range is 1 day === 24 hours.  The interval is 1 hour.  So there should
be ~24 time series points in the output.

For preview purposes:

- The `termSize` parameter should be used to help cut
down on the amount of work ES does, and keep the generated graphs a little
simpler.  Probably something like `10`.

- For queries with long date ranges, you probably don't want to use the
`interval` the alert is set to, as the `interval` used in the query, as this
could result in a lot of time-series points being generated, which is both
costly in ES, and may result in noisy graphs.

- The `timeWindow*` parameters should be the same as what the alert is using, 
especially for the `count` and `sum` aggregation types.  Those aggregations
don't scale the same way the others do, when the window changes.  Even for
the other aggregations, changing the window could result in dramatically
different values being generated - `avg` will be more "average-y", `min`
and `max` will be a little stickier.
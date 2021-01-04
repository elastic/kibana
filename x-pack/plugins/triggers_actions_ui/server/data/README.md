# Data Apis

The TriggersActionsUi plugin's Data Apis back the functionality needed by the Index Threshold Stack Alert.

## http endpoints

The following endpoints are provided for this alert type:

- `POST /api/triggers_actions_ui/data/_indices`
- `POST /api/triggers_actions_ui/data/_fields`
- `POST /api/triggers_actions_ui/data/_time_series_query`

### `POST .../_indices`

This HTTP endpoint is provided for the alerting ui to list the available
"index names" for the user to select to use with the alert.  This API also
returns aliases which match the supplied pattern.

The request body is expected to be a JSON object in the following form, where the
`pattern` value may include comma-separated names and wildcards.

```js
{
  pattern: "index-name-pattern"
}
```

The response body is a JSON object in the following form, where each element
of the `indices` array is the name of an index or alias.  The number of elements
returned is limited, as this API is intended to be used to help narrow down
index names to use with the alert, and not support pagination, etc.

```js
{
  indices: ["index-name-1", "alias-name-1", ...]
}
```

### `POST .../_fields`

This HTTP endpoint is provided for the alerting ui to list the available
fields for the user to select to use with the alert.

The request body is expected to be a JSON object in the following form, where the
`indexPatterns` array elements may include comma-separated names and wildcards.

```js
{
  indexPatterns: ["index-pattern-1", "index-pattern-2"]
}
```

The response body is a JSON object in the following form, where each element
fields array is a field object.

```js
{
  fields: [fieldObject1, fieldObject2, ...]
}
```

A field object is the following shape:

```typescript
{
  name: string,           // field name
  type: string,           // field type - eg 'keyword', 'date', 'long', etc
  normalizedType: string, // for numeric types, this will be 'number'
  aggregatable: true,     // value from elasticsearch field capabilities
  searchable: true,       // value from elasticsearch field capabilities
}
```

### `POST .../_time_series_query`

This HTTP endpoint is provided to return the values the alertType would calculate,
over a series of time.  It is intended to be used in the alerting UI to 
provide a "preview" of the alert during creation/editing based on recent data,
and could be used to show a "simulation" of the the alert over an arbitrary
range of time.

The endpoint is `POST /api/triggers_actions_ui/data/_time_series_query`.
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
curl -k  "https://elastic:changeme@localhost:5601/api/triggers_actions_ui/data/_time_series_query" \
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
curl -k  "https://elastic:changeme@localhost:5601/api/triggers_actions_ui/data/_time_series_query" \
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
of the http endpoint `POST /api/triggers_actions_ui/data/_time_series_query`,
but as an API for Kibana plugins.  The function is available as
`triggersActionsUi.data.timeSeriesQuery()` on the plugin's _Start_ contract

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
# Infra Hosts API

This API returns a list of hosts and their metrics.

**POST /api/metrics/hosts**
parameters:

- limit: max number of hosts; accepts from 1 to 100
- metrics: list of metrics to be calculated and returned for each host
- sourceId: sourceId to retrieve configuration such as index-pattern used to query the results
- timeRange: time range object containing start and end attributes - passed in timestamp
- (optional) query: filter
- (optional) sortField: field used to sort the results
- (optional) sortDirection: "asc" | "desc"

The response includes:

- hosts: array of metrics and metadata
- metrics: object containing name of the metric and value
- metadata: object containing name of the metadata and value

## Examples

Request

```bash
curl --location -u elastic:changeme 'http://0.0.0.0:5601/ftw/api/metrics/hosts' \
--header 'kbn-xsrf: xxxx' \
--header 'Content-Type: application/json' \
--data '{
    "limit": 100,
    "metrics": [
        {
            "type": "rx"
        },
        {
            "type": "tx"
        },
        {
            "type": "memory"
        },
        {
            "type": "cpu"
        },
        {
            "type": "diskLatency"
        },
        {
            "type": "memoryTotal"
        }
    ],
    "query": {
        "bool": {
            "must": [],
            "filter": [],
            "should": [],
            "must_not": []
        }
    },
    "timeRange": {
        "from": 1680040800000,
        "to":   1680645600000
    },
    "sortField": "rx",
    "sortDirection": "desc",
    "sourceId": "default"
}'
```

Response

```json
{
   "hosts":[
      {
         "metadata":[
            {
               "name":"host.os.name",
               "value":null
            },
            {
               "name":"cloud.provider",
               "value":null
            }
         ],
         "metrics":[
            {
               "name":"cpu",
               "value":0.13271302652800487
            },
            {
               "name":"diskLatency",
               "value":0
            },
            {
               "name":"memory",
               "value":0.542838307852529
            },
            {
               "name":"memoryTotal",
               "value":66640704.099216014
            },
            {
               "name":"rx",
               "value":3959.4930095127706
            },
            {
               "name":"tx",
               "value":100.26926542816672
            }
         ],
         "name":"host-0"
      }
   ]
}
```

# Infra Hosts API

This API returns a list of hosts and their metrics.

**POST /api/metrics/infra**
parameters:

- type: asset type. 'host' is the only one supported now
- metrics: list of metrics to be calculated and returned for each host
- sourceId: sourceId to retrieve configuration such as index-pattern used to query the results
- limit: max number of hosts - max 500
- timeRange: time range object containing start and end attributes - passed in timestamp
- (optional) query: filter

The response includes:

- hosts: array of metrics and metadata
- metrics: object containing name of the metric and value
- metadata: object containing name of the metadata and value

## Examples

Request

```bash
curl --location -u elastic:changeme 'http://0.0.0.0:5601/ftw/api/metrics/infra' \
--header 'kbn-xsrf: xxxx' \
--header 'Content-Type: application/json' \
--data '{
   "type": 'host',
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
         type: 'diskSpaceUsage',
      },
      {
         type: 'memoryFree',
      },
   ],
   "query": {
      "bool": {
         "must": [],
         "filter": [],
         "should": [],
         "must_not": []
      }
   },
   "range": {
      "from": "2023-04-18T11:15:31.407Z",
      "to":   "2023-04-18T11:30:31.407Z"
   },
   "sourceId": "default"
}'
```

Response

```json
{
   "type": "host",
   "nodes":[
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
               "name":"rx",
               "value":3959.4930095127706
            },
            {
               "name":"tx",
               "value":100.26926542816672
            }
            {
               "name":"memory",
               "value":0.542838307852529
            },
            {
               "name":"cpu",
               "value":0.13271302652800487
            },
            {
               "name":"diskSpaceUsage",
               "value":0
            },
            {
               "name":"memoryFree",
               "value":66640704.099216014
            },
         ],
         "name":"host-0"
      }
   ]
}
```

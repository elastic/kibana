# Infra Assets API

## **POST /api/metrics/infra**

This endpoint returns a list of hosts and their metrics.

### Parameters:

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
- hasSystemMetrics: boolean - true if host comes from system integration docs; false otherwise

### Examples:

Request

```bash
curl --location -u elastic:changeme 'http://0.0.0.0:5601/ftw/api/metrics/infra/host' \
--header 'kbn-xsrf: xxxx' \
--header 'Content-Type: application/json' \
--data '{
   "limit": 100,
   "metrics": [ "rx", "tx", "memory", "cpu", "diskSpaceUsage", "memoryFree"],
   "query": {
      "bool": {
         "must": [],
         "filter": [],
         "should": [],
         "must_not": []
      }
   },
   "from": "2023-04-18T11:15:31.407Z",
   "to":   "2023-04-18T11:30:31.407Z"
}'
```

Response

```json
{
   "assetType": "host",
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
         "hasSystemMetrics": true,
         "name":"host-0"
      }
   ]
}
```

## **POST /api/infra/{assetType}/count**

This endpoint returns the count of the hosts monitored with the system integration.

### Parameters:

- type: asset type. 'host' is the only one supported now
- sourceId: sourceId to retrieve configuration such as index-pattern used to query the results
- from: Start date
- to: End date
- (optional) query: filter

The response includes:

- count: number - the count of the hosts monitored with the system integration 
- type: string - the type of the asset **(currently only 'host' is supported)**

### Examples:

Request

```bash
curl --location -u elastic:changeme 'http://0.0.0.0:5601/ftw/api/infra/host/count' \
--header 'kbn-xsrf: xxxx' \
--header 'Content-Type: application/json' \
--data '{
   "query": {
      "bool": {
         "must": [],
         "filter": [],
         "should": [],
         "must_not": []
      }
   },
   "from": "2024-07-23T11:34:11.640Z",
   "to": "2024-07-23T11:49:11.640Z",
   "sourceId": "default"
}'
```

Response

```json
{"assetType":"host","count":22}
```
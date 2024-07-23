# Infra Hosts API

This API returns the count of the hosts monitored with the system integration.

**POST /api/metrics/infra/hosts_count**
parameters:

- type: asset type. 'host' is the only one supported now
- sourceId: sourceId to retrieve configuration such as index-pattern used to query the results
- from: Start date
- to: End date
- (optional) query: filter

The response includes:

- count: number - the count of the hosts monitored with the system integration 

## Examples

Request

```bash
curl --location -u elastic:changeme 'http://0.0.0.0:5601/ftw/api/metrics/infra/hosts_count' \
--header 'kbn-xsrf: xxxx' \
--header 'Content-Type: application/json' \
--data '{
   "type": "host",
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
{"type":"host","count":22}
```
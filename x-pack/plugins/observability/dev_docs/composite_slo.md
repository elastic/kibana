# Composite SLO

Composite SLO is available from 8.9.

A composite SLO is an SLO that aggregates up to 30 other SLOs, so we can get a higher view of the performance of a service.
A composite SLO uses the rollup data of the source SLOs with the applied weight to compute its SLI and error budget consumption & remaining.

We currently support only weighted average composite method. This means every source SLO is given a weight (1 to +Infinity) that we use to compute the composite SLI.

When creating a composite SLO, we validate that every source SLOs are of the same time window and budgeting method.

## Examples

Create a composite SLO:

```
curl --request POST \
  --url http://localhost:5601/kibana/api/observability/composite_slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "composite slo test",
	"compositeMethod": "weightedAverage",
	"sources": [
		{ "id": "f6694b30-f97c-11ed-895c-170d13e61076", "revision": 1, "weight": 2 },
		{ "id": "f9072790-f97c-11ed-895c-170d13e61076", "revision": 2, "weight": 1 }
	],
	"timeWindow": {
		"duration": "7d",
		"type": "rolling"
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.95
	}
}'
```


Delete a composite SLO:

```
curl --request DELETE \
  --url http://localhost:5601/kibana/api/observability/composite_slos/7ba92850-fbd6-11ed-8eb2-037af7d0dfa6 \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui'
```

Update an existing composite SLO:

```
curl --request PUT \
  --url http://localhost:5601/kibana/api/observability/composite_slos/01af9e10-fbf1-11ed-83f3-01ffee47b374 \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "new composite slo name",
	"objective": {
		"target": 0.90
	}
}'
```
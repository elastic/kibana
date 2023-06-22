### Stack Monitoring Health API

A endpoint that makes a handful of pre-determined queries to determine the health/status of stack monitoring for the configured kibana.

**GET /api/monitoring/v1/_health**
parameters:
- (optional) min: start date of the queries, in ms or YYYY-MM-DD hh:mm:ss
- (optional) max: end date of the queries, in ms or YYYY-MM-DD hh:mm:ss
- (optional) timeout: maximum timeout of the queries, in seconds

The response includes sections that can provide useful informations in a debugging context:
- settings: a subset of the kibana.yml settings relevant to stack monitoring
- monitoredClusters: a representation of the monitoring documents available to the running kibana. It exposes which metricsets are collected by what collection mode and when was the last time it was ingested. The query groups the metricsets by products and can help identify missing documents that could explain why a page is not loading or crashing
- metricbeatErrors: a list of errors encountered by metricbeat processes when collecting data
- packageErrors: a list of  errors encountered by integration package processes when collecting data
# Terminology

### Monitored product / Stack component

In some cases these may just be referred to as "products" or "components", these are the individual parts of the Elastic stack that Stack Monitoring, as an application, is concerned with monitoring. Examples include Elasticsearch, Kibana, Logstash, Beats, APM, etc. 

### Collection modes

Stack monitoring data (i.e. the data collected about a given product) has been collected in many different ways over the years. A collection mode is a method for getting these data into Elasticsearch to be stored for later query retrieval.

#### Internal collection

The process of collecting monitoring data handled by the stack components themselves. Each component is responsible for sending documents to the Elasticsearch monitoring deployment directly.

#### Standalone Beat collection

The process of collecting monitoring data using Metricbeat and/or Filebeat directly. This collection mode requires a user to run the Beat binaries and have them configured using the appropriate Beat modules. These modules query HTTP endpoints for their given stack component (e.g. the Kibana module queries Kibana HTTP endpoints), validates the data, and then stores it in the Elasticsearch monitoring deployment.

#### Elastic Agent collection (aka package-based, aka integration-based)

Elastic Agent is a binary that runs many other binary applications on behalf of the user, including Metricbeat and Filebeat among others. For this reason, Agent-based collection still uses Beats under the hood. This is why the other Beats-based collection mode is referred to as "Standalone Beat" collection.

### Production deployment

The deployment that receives customer service data, as distinguished from [monitoring deployment](#monitoring-deployment). For example, given two deployments:

- A: the deployment that stores the customer's service observability data
- B: the deployment that stores the monitoring data

The production deployment will be "A" and the "monitoring" deployment will be "B".

If the deployment is [self-monitored](#self-monitoring), then the production deployment is the same as the monitoring deployment.

### Monitoring deployment

The deployment that receives stack monitoring data from the production deployment(s), as distinguished from the [production deployment](#production-deployment).

#### Self-monitoring

The practice of storing stack monitoring data in the same deployment that is being monitored. This can be useful for testing, development, and quick start onboaring, but it's not recommended for production.

This is because you will very likely want to see monitoring data when the production deployment is down or slow to ingest. If they're the same deployment, the monitoring data will be unavailable as well and useless for troubleshooting.

#### Standalone Cluster

A "fake" cluster in stack monitoring used to group any component metrics that are not associated with a cluster UUID (`cluster_uuid: ''`). Not to be confused with (a) a cluster (it's not a cluster, it's really more of a standalone _stack component_) or (b) standalone beat collection, which just happens to share the use of the word "standalone".

The Stack Monitoring UI is built around the idea of an Elasticsearch cluster and showing all the products which publish into that cluster. Some stack components (Logstash and Beats) can work fine without an Elasticsearch cluster and are often used this way. The "Standalone Cluster" allows us to monitor components running in that mode.

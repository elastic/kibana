| Field | Description |
| --- | --- |
| `has_any_services` | Indicates whether any service is being monitored. This is determined by checking all agents. |
| `version.apm_server.major` | The major version of the APM server. Example: 7 |
| `version.apm_server.minor` | The minor version of the APM server. Example: 17 |
| `version.apm_server.patch` | The patch version of the APM server. Example 3 |
| `environments.services_without_environment` | Number of services without an assigned environment. This is determined by checking the "service.environment" field and counting instances where it is null |
| `environments.services_with_multiple_environments` | Number of services with more than one assigned environment |
| `environments.top_environments.items` | An array of the top 5 environments in terms of document count |
| `cloud.availability_zone.items` | An array of the top 10 cloud availability zones in terms of document count. Example: [us-east1-c, us-east1-b] |
| `cloud.provider.items` | An array of the top 10 cloud providers in terms of document count. Example: [azure] |
| `cloud.region.items` | An array of the top 10 cloud regions in terms of document count. Example: [us-west1, us-central1] |
| `host.os.platform.items` | An array of the top 10 operating system platforms in terms of document count. Example: [linux, win32] |
| `counts.transaction.1d` | Total number of transaction documents within the last day |
| `counts.transaction.all` | Total number of transaction documents overall |
| `counts.span.1d` | Total number of span documents within the last day |
| `counts.span.all` | Total number of span documents overall |
| `counts.error.1d` | Total number of error documents within the last day |
| `counts.error.all` | Total number of error documents overall |
| `counts.metric.1d` | Total number of metric documents within the last day |
| `counts.metric.all` | Total number of metric documents overall |
| `counts.onboarding.1d` | Total number of onboarding documents within the last day |
| `counts.onboarding.all` | Total number of onboarding documents overall |
| `counts.agent_configuration.all` | Total number of apm-agent-configuration documents overall |
| `counts.max_transaction_groups_per_service.1d` | Total number of distinct transaction groups for the top service for the last last 24 hours |
| `counts.max_error_groups_per_service.1d` | Total number of distinct error groups for the top service for the last last 24 hours |
| `counts.traces.1d` | Total number of trace documents within the last day |
| `counts.traces.all` | Total number of trace documents overall |
| `cardinality.client.geo.country_iso_code.rum.1d` | Unique country iso code captured for the agents js-base, rum-js and opentelemetry/webjs. |
| `retainment.span.ms` | Represent the time difference in milliseconds between the current date and the date when the span document was recorded |
| `retainment.transaction.ms` | Represent the time difference in milliseconds between the current date and the date when the transaction document was recorded |
| `retainment.error.ms` | Represent the time difference in milliseconds between the current date and the date when the error document was recorded |
| `retainment.metric.ms` | Represent the time difference in milliseconds between the current date and the date when the metric document was recorded |
| `retainment.onboarding.ms` | Represent the time difference in milliseconds between the current date and the date when the onboarding document was recorded |
| `integrations.ml.all_jobs_count` | Total number of anomaly detection jobs associated with the jobs apm-*, *-high_mean_response_time |
| `indices.traces.shards.total` | Total number of shards |
| `indices.traces.all.total.docs.count` | Total number of transaction and span documents overall |
| `indices.traces.all.total.store.size_in_bytes` | Size of the index in byte units. |
| `indices.shards.total` | Total number of shards |
| `indices.all.total.docs.count` | Total number of all documents overall |
| `indices.all.total.store.size_in_bytes` | Size of the index in byte units. |
| `service_groups.kuery_fields.items` | An array of up to 500 unique fields used to create the service groups. Example  [service.language.name, service.name]  |
| `service_groups.total` | Total number of service groups retrived from the saved object across all spaces |
| `per_service.items.service_id` | Unique identifier that combines the SHA256 hashed representation of the service name and environment |
| `per_service.items.num_service_nodes` | Total number of the unique service instances that served the transaction |
| `per_service.items.num_transaction_types` | Total number of the unique transaction types |
| `per_service.items.timed_out` | Indicates whether the request timed out before completion |
| `per_service.items.cloud.availability_zones.items` | An array of the top 5 cloud availability zones. Example [ca-central-1a, ca-central-1b] |
| `per_service.items.cloud.regions.items` | An array of the top 5 cloud regions. Example [ca-central-1] |
| `per_service.items.cloud.providers.items` | An array of the top 3 cloud provider. Example [aws] |
| `per_service.items.faas.trigger.type.items` | An array of the top 5 faas trigger types. Example [http, timer, pubsub] |
| `per_service.items.agent.name` | The top value of agent name for the service from transaction documents. Sorted by _score |
| `per_service.items.agent.version` | The top value of agent version for the service from transaction documents. Sorted by _score |
| `per_service.items.agent.activation_method` | The top value of agent activation method for the service from transaction documents. Sorted by _score |
| `per_service.items.service.language.name` | The top value of language name for the service from transaction documents. Sorted by _score |
| `per_service.items.service.language.version` | The top value of language version for the service from transaction documents. Sorted by _score |
| `per_service.items.service.framework.name` | The top value of service framework name from transaction documents. Sorted by _score. Example AWS Lambda |
| `per_service.items.service.framework.version` | The top value of service framework version from transaction documents. Sorted by _score |
| `per_service.items.service.runtime.name` | The top value of service runtime name from transaction documents. Sorted by _score |
| `per_service.items.service.runtime.version` | The top value of service runtime version version from transaction documents. Sorted by _score |
| `tasks.aggregated_transactions.took.ms` | Execution time in milliseconds for the "aggregated_transactions" task |
| `tasks.cloud.took.ms` | Execution time in milliseconds for the "cloud" task |
| `tasks.host.took.ms` | Execution time in milliseconds for the "host" task |
| `tasks.processor_events.took.ms` | Execution time in milliseconds for the "processor_events" task |
| `tasks.agent_configuration.took.ms` | Execution time in milliseconds for the "agent_configuration" task |
| `tasks.services.took.ms` | Execution time in milliseconds for the "services" task |
| `tasks.versions.took.ms` | Execution time in milliseconds for the "versions" task |
| `tasks.groupings.took.ms` | Execution time in milliseconds for the "groupings" task |
| `tasks.integrations.took.ms` | Execution time in milliseconds for the "integrations" task |
| `tasks.agents.took.ms` | Execution time in milliseconds for the "agents" task |
| `tasks.indices_stats.took.ms` | Execution time in milliseconds for the "indices_stats" task |
| `tasks.cardinality.took.ms` | Execution time in milliseconds for the "cardinality" task |
| `tasks.environments.took.ms` | Execution time in milliseconds for the "environments" task |
| `tasks.service_groups.took.ms` | Execution time in milliseconds for the "service_groups" task |
| `tasks.per_service.took.ms` | Execution time in milliseconds for the "per_service" task |
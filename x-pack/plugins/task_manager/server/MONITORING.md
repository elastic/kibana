# Task Manager Monitoring

Task Manager has an internal monitoring mechanism in which keeps track of a variety of metrics which are exposed via a `health` api endpoint and Kibana Server Log debug messaging.

## Exposed Metrics
There are three different sections to the stats returned by the `health` api.
- `configuration`: Summarizes Task Manager's current configuration.
- `workload`: Summarizes the workload in the current deployment.
- `runtime`: Tracks Task Manager's performance.

### Configuring the Stats
There are four new configurations:

- `xpack.task_manager.monitored_stats_required_freshness` - The _required freshness_ of critical "Hot" stats, which means that if key stats (last polling cycle time, for example) haven't been refreshed within the specified duration, the `_health` endpoint and service will report an `Error` status. By default this is inferred from the configured `poll_interval` and is set to `poll_interval` plus a `1s` buffer.
- `xpack.task_manager.monitored_aggregated_stats_refresh_rate` - Dictates how often we refresh the "Cold" metrics.  These metrics require an aggregation against Elasticsearch and add load to the system, hence we want to limit how often we execute these. We also inffer the _required freshness_ of these "Cold" metrics from this configuration, which means that if these stats have not been updated within the required duration then the `_health` endpoint and service will report an `Error` status. This covers the entire `workload` section of the stats. By default this is configured to `60s`, and as a result the _required freshness_ defaults to `61s` (refresh plus a `1s` buffer).
- `xpack.task_manager.monitored_stats_running_average_window`- Dictates the size of the window used to calculate the running average of various "Hot" stats, such as the time it takes to run a task, the _drift_ that tasks experience etc. These stats are collected throughout the lifecycle of tasks and this window will dictate how large the queue we keep in memory would be, and how many values we need to calculate the average against. We do not calculate the average on *every* new value, but rather only when the time comes to summarize the stats before logging them or returning them to the API endpoint.
- `xpack.task_manager.monitored_task_execution_thresholds`- Configures the threshold of failed task executions at which point the `warn` or `error` health status will be set either at a default level or a custom level for specific task types. This will allow you to mark the health as `error` when any task type failes 90% of the time, but set it to `error` at 50% of the time for task types that you consider critical. This value can be set to any number between 0 to 100, and a threshold is hit when the value *exceeds* this number. This means that you can avoid setting the status to `error` by setting the threshold at 100, or hit `error` the moment any task failes by setting the threshold to 0 (as it will exceed 0 once a single failer occurs).

For example, in your `Kibana.yml`:
```
xpack.task_manager.monitored_stats_required_freshness: 5000
xpack.task_manager.monitored_aggregated_stats_refresh_rate: 60000
xpack.task_manager.monitored_stats_running_average_window: 50
xpack.task_manager.monitored_task_execution_thresholds:
  default:
    error_threshold: 70
    warn_threshold: 50
  custom:
    "alerting:always-firing":
      error_threshold: 50
      warn_threshold: 0
```

## Consuming Health Stats

Public Documentation: https://www.elastic.co/guide/en/kibana/master/task-manager-health-monitoring.html#task-manager-consuming-health-stats

### Understanding the Exposed Stats

As mentioned above, the `health` api exposes three sections: `configuration`, `workload` and `runtime`.
Each section has a `timestamp` and a `status` which indicates when the last update to this setion took place and whether the health of this section was evaluated as `OK`, `Warning` or `Error`.

The root has its own `status` which indicate the state of the system overall as infered from the `status` of the section.
An `Error` status in any section will cause the whole system to display as `Error`.
A `Warning` status in any section will cause the whole system to display as `Warning`.
An `OK` status will only be displayed when all sections are marked as `OK`.

The root `timestamp` is the time in which the summary was exposed (either to the DEBUG logger or the http api) and the `last_update` is the last time any one of the sections was updated.

Follow this step-by-step guide to make sense of the stats: https://www.elastic.co/guide/en/kibana/master/task-manager-troubleshooting.html#task-manager-diagnosing-root-cause

#### The Configuration Section
The `configuration` section summarizes Task Manager's current configuration, including dynamic configurations which change over time, such as `poll_interval` and `max_workers` which adjust in reaction to changing load on the system.

These are "Hot" stats which are updated whenever a change happens in the configuration.

#### The Workload Section
The `workload` which summarizes the work load in the current deployment, listing the tasks in the system, their types and what their current status is.

It includes three sub sections:
  - The number of tasks scheduled in the system, broken down by type and status.
  - The number of idle `overdue` tasks, whose `runAt` has expired.
  - Execution density in the next minute or so (configurable), which shows how many tasks are scheduled to execute in the scope of each polling interval. This can give us an idea of how much load there is on the current Kibana deployment.

These are "Cold" stat which are updated at a regular cadence, configured by the `monitored_aggregated_stats_refresh_rate` config.

#### The Runtime Section
The `runtime` tracks Task Manager's performance as it runs, making note of task execution time, _drift_ etc.
These include:
  - The time it takes a task to run (p50, p90, p95 & p99, using a configurable running average window, `50` by default)
  - The average _drift_ that tasks experience (p50, p90, p95 & p99, using the same configurable running average window as above). Drift tells us how long after a task's scheduled a task typically executes.
  - The average _load_ (p50, p90, p95 & p99, using the same configurable running average window as above). Load tells us what percentage of workers is in use at the end of each polling cycle.
  - The polling rate (the timestamp of the last time a polling cycle completed), the polling health stats (number of version clashes and mismatches) and the result [`No tasks | Filled task pool | Unexpectedly ran out of workers`] frequency the past 50 polling cycles (using the same window size as the one used for running averages)
  - The `Success | Retry | Failure ratio` by task type. This is different than the workload stats which tell you what's in the queue, but ca't keep track of retries and of non recurring tasks as they're wiped off the index when completed.

These are "Hot" stats which are updated reactively as Tasks are executed and interacted with.

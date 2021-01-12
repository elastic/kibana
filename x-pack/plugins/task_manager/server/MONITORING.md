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
Task Manager exposes a `/api/task_manager/_health` api which returns the _latest_ stats.
Calling this API is designed to be fast and doesn't actually perform any checks- rather it returns the result of the latest stats in the system, and is design in such a way that you could call it from an external service on a regular basis without worrying that you'll be adding substantial load to the system.

Additionally, the metrics are logged out into Task Manager's `DEBUG` logger at a regular cadence (dictated by the Polling Interval).
If you wish to enable DEBUG logging in your Kibana instance, you will need to add the following to your `Kibana.yml`:
```
logging:
  loggers:
      - context: plugins.taskManager
        appenders: [console]
        level: debug
```

Please bear in mind that these stats are logged as often as your `poll_interval` configuration, which means it could add substantial noise to your logs.
We would recommend only enabling this level of logging temporarily.

### Understanding the Exposed Stats

As mentioned above, the `health` api exposes three sections: `configuration`, `workload` and `runtime`.
Each section has a `timestamp` and a `status` which indicates when the last update to this setion took place and whether the health of this section was evaluated as `OK`, `Warning` or `Error`.

The root has its own `status` which indicate the state of the system overall as infered from the `status` of the section.
An `Error` status in any section will cause the whole system to display as `Error`.
A `Warning` status in any section will cause the whole system to display as `Warning`.
An `OK` status will only be displayed when all sections are marked as `OK`.

The root `timestamp` is the time in which the summary was exposed (either to the DEBUG logger or the http api) and the `last_update` is the last time any one of the sections was updated.

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

### Example Stats

For example, if you _curl_ the `/api/task_manager/_health` endpoint, you might get these stats:
```
{
     /* the time these stats were returned by the api */
    "timestamp": "2020-10-05T18:26:11.346Z",
     /* the overall status of the system */
    "status": "OK",
     /* last time any stat was updated in this output */
    "last_update": "2020-10-05T17:57:55.411Z",    
    "stats": {
        "configuration": {      /* current configuration of TM */
            "timestamp": "2020-10-05T17:56:06.507Z",
            "status": "OK",
            "value": {
                "max_workers": 10,
                "poll_interval": 3000,
                "request_capacity": 1000,
                "max_poll_inactivity_cycles": 10,
                "monitored_aggregated_stats_refresh_rate": 60000,
                "monitored_stats_running_average_window": 50
            }
        },
        "workload": {  /* The workload of this deployment */
            "timestamp": "2020-10-05T17:57:06.534Z",
            "status": "OK",
            "value": {
                "count": 6,        /* count of tasks in the system */
                "task_types": {   /* what tasks are there and what status are they in */
                    "actions_telemetry": {
                        "count": 1,
                        "status": {
                            "idle": 1
                        }
                    },
                    "alerting_telemetry": {
                        "count": 1,
                        "status": {
                            "idle": 1
                        }
                    },
                    "apm-telemetry-task": {
                        "count": 1,
                        "status": {
                            "idle": 1
                        }
                    },
                    "endpoint:user-artifact-packager": {
                        "count": 1,
                        "status": {
                            "idle": 1
                        }
                    },
                    "lens_telemetry": {
                        "count": 1,
                        "status": {
                            "idle": 1
                        }
                    },
                    "session_cleanup": {
                        "count": 1,
                        "status": {
                            "idle": 1
                        }
                    }
                },

                /* Frequency of recurring tasks schedules */
                "schedule": [  
                    ["60s", 1],   /* 1 task, every 60s */
                    ["3600s", 3],  /* 3 tasks every hour */
                    ["720m", 1]
                ],
                /* There are no overdue tasks in this system at the moment */
                "overdue": 0, 
                /* This is the schedule density, it shows a histogram of all the  polling intervals in the next minute (or, if 
                    pollInterval is configured unusually high it will show a min of 2 refresh intervals into the future, and a max of 50 buckets).
                    Here we see that on the 3rd polling interval from *now* (which is ~9 seconds from now, as pollInterval is `3s`) there is one task due to run.
                    We also see that there are 5 due two intervals later, which is fine as we have a max workers of `10`
                 */
                "estimated_schedule_density": [0, 0, 1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
        },
        "runtime": {
            "timestamp": "2020-10-05T17:57:55.411Z",
            "status": "OK",
            "value": {
                "polling": {
                    /* When was the last polling cycle? */
                    "last_successful_poll": "2020-10-05T17:57:55.411Z",
                    /* Running average of polling duration measuring the time from the scheduled polling cycle
                        start until all claimed tasks are marked as running */
                    "duration": {
                        "p50": 4,
                        "p90": 12,
                        "p95": 12,
                        "p99": 12
                    },
                    /* Running average of number of version clashes caused by the markAvailableTasksAsClaimed stage
                        of the polling cycle */
                    "claim_conflicts": {
                        "p50": 0,
                        "p90": 0,
                        "p95": 0,
                        "p99": 0
                    },
                    /* Running average of mismatch between the number of tasks updated by the markAvailableTasksAsClaimed stage
                        of the polling cycle and the number of docs found by the sweepForClaimedTasks stage */
                    "claim_mismatches": {
                        "p50": 0,
                        "p90": 0,
                        "p95": 0,
                        "p99": 0
                    },
                    /* What is the frequency of polling cycle result?
                        Here we see 94% of "NoTasksClaimed" and 6%  "PoolFilled" */
                    "result_frequency_percent_as_number": {
                        /* This tells us that the polling cycle didnt claim any new tasks */
                        "NoTasksClaimed": 94,
                        /* This is a legacy result we are renaming in 8.0.0 -
                            it tells us when a polling cycle resulted in claiming more tasks
                            than we had workers for, butt he name doesn't make much sense outside of the context of the code */
                        "RanOutOfCapacity": 0, 
                        /* This is a legacy result we are renaming in 8.0.0 -
                            it tells us when a polling cycle resulted in tasks being claimed but less the the available workers */
                        "PoolFilled": 6,
                        /* This tells us when a polling cycle resulted in no tasks being claimed due to there being no available workers */
                        "NoAvailableWorkers": 0,
                        /* This tells us when a polling cycle resulted in tasks being claimed at 100% capacity of the available workers */
                        "RunningAtCapacity": 0,
                        /* This tells us when the poller failed to claim */
                        "Failed": 0
                    }
                },
                /* on average, 50% of the tasks in this deployment run at most 1.7s after their scheduled time */
                "drift": {
                    "p50": 1720,
                    "p90": 2274,
                    "p95": 2574,
                    "p99": 3221
                },
                /* on average, 50% of the tasks polling cycles in this deployment result at most in 25% of workers being in use.
                    We track this in percentages rather than absolute count as max_workers can change over time in response
                    to changing circumstance. */
                "load": {
                    "p50": 25,
                    "p90": 80,
                    "p95": 100,
                    "p99": 100
                },
                "execution": {
                    "duration": {
                        /* on average, the `endpoint:user-artifact-packager` tasks take 15ms to run */
                        "endpoint:user-artifact-packager": {
                            "mean": 15,
                            "median": 14.5
                        },
                        "session_cleanup": {
                            "mean": 28,
                            "median": 28
                        },
                        "lens_telemetry": {
                            "mean": 100,
                            "median": 100
                        },
                        "actions_telemetry": {
                            "mean": 135,
                            "median": 135
                        },
                        "alerting_telemetry": {
                            "mean": 197,
                            "median": 197
                        },
                        "apm-telemetry-task": {
                            "mean": 1347,
                            "median": 1347
                        }
                    },
                    "result_frequency_percent_as_number": {
                        /* and 100% of `endpoint:user-artifact-packager` have completed in success (within the running average window,
                            so the past 50 runs (by default, configrable by `monitored_stats_running_average_window`) */
                        "endpoint:user-artifact-packager": {
                            "status": "OK",
                            "Success": 100,
                            "RetryScheduled": 0,
                            "Failed": 0
                        },
                        "session_cleanup": {
                            /* `error` status as 90% of results are `Failed` */
                            "status": "error",
                            "Success": 5,
                            "RetryScheduled": 5,
                            "Failed": 90
                        },
                        "lens_telemetry": {
                            "status": "OK",
                            "Success": 100,
                            "RetryScheduled": 0,
                            "Failed": 0
                        },
                        "actions_telemetry": {
                            "status": "OK",
                            "Success": 100,
                            "RetryScheduled": 0,
                            "Failed": 0
                        },
                        "alerting_telemetry": {
                            "status": "OK",
                            "Success": 100,
                            "RetryScheduled": 0,
                            "Failed": 0
                        },
                        "apm-telemetry-task": {
                            "status": "OK",
                            "Success": 100,
                            "RetryScheduled": 0,
                            "Failed": 0
                        }
                    }
                }
            }
        }
    }
}
```

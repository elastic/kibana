# Task Manager

The task manager is a system for running background tasks in Kibana. Background tasks can run on a recurring schedule, or be one-time tasks. Eventually, background tasks will be run in a separate process from the main Kibana server.

## TODO

- Support storage of user tokens so that tasks are run in the context of the user that created them
- Test the task_store class and tidy it up
- Create a Kibana plugin and service to expose the ability to schedule and delete tasks
- Write integration tests


## Task Pool

The core logic behind running tasks is the task pool. This is a function which polls the task manager index, looking for scheduled tasks which have timed out or whose schedule has arrived. It coordinates the running of these tasks across a cluster of Kibana instances.

The task pool has logic in place that ensures:

- No more than `maxPoolSize` tasks will run on any given Kibana instance.
- The task pool index is queried efficiently, batching access and ensuring that no single Kibana instance competes with itself for tasks

The pool returns an object which allows:

  - Manually forcing the pool to look for more work
  - Querying the pool for stats on its currently running tasks


## Tasks

Plugins can define tasks by adding a `tasks` property to their plugin spec.

```js

{
  tasks: {
    // 'mytask' is the task type, and should be unique across the system
    mytask: {
      title: 'A required, human friendly title',
      description: 'An optional, more detailed description',
      timeOut: '5m', // Optional, specified in minutes, defaults to 5m
      async run(context) {
        return Promise.resolve('Do something fanci here!');
      },
    },
  },
},

```

The task context looks like this:

```js
{
  // A function which calls Elasticsearch with the same user-context
  // as the user who scheduled this task.
  callCluster,

  // A task-specific object containing whatever data the task needs
  // in order to perform its work. It is up to task authors to define
  // what params their task expects. An example for a notification task
  // might be something like this: { emails: ['foo@example.com'] }
  params,

  // Whatever is returned from the last successful run of the task,
  // if this is a recurring task. This will be the empty object `{}`
  // if this is the first run of a task.
  previousResult,
}
```
























## General Approach

The initial MVP for task manager will be quite restrictive. It is designed to solve a specific problem (cluster alerts), and no deep thought has gone into extensibility.

- Two kinds of scheduled tasks:
  - Immediate: one-time tasks
  - Recurring: tasks which will recurr on a scheduled basis
- Restrictions in the MVP
  - Only allows recurring tasks to be scheduled in increments of one minute (e.g. 1m, 2m, 5m, 10m)
  - Cron-like or more complex scheduling is not supported
  - Extending the system to provide new kinds of types via plugins is not supported
  - Adding custom schedule types or overriding the "reschedule" logic is not supported
  - Tasks do not have a heartbeat, or any kind of sophisticated mechanism for detecting "stuck" states
- Both immediate and recurring tasks can be given a scheduled time for their first run
- Background tasks have a "nextRun" property, which is a timestamp indicating the earliest time the task can run
  - Dependng on how busy the scheudled task system is, tasks with a nextRun may run significantly later than the specified date, but are guaranteed not to run before it
- Each instance of Kibana has a task pool of configurable size
  - This is the maximum number of tasks that are permitted to run simultaneously within a single instance
- Multiple Kibana instances coordinate in order to not do duplicate work
  - This is done using optimistic concurrency
  - Tasks are written into and read from
  - This index is polled periodically (with a bit of intelligence) in order to detect new work
  - Using optimistic concurrency
    - Sets status 'running'
    - Sets nextRun to the next date (e.g. now + 5 mins, in the case of the example above)
  - Invokes the task function, passing it the configured args and previous state
  - If the task fails (promise rejection), log the error, but in V1, no reattempts-- it'll run again at the next interval
  - Regardless of success or failure, reset the status to 'idle'
- Detailed logging
- Recurring task previousState
  - Tasks can return data of any shape
  - The return value of a task is stored and passed into the next run of that task as `opts.previousState`
  - This allows tasks to be a bit more powerful in what they can reason about (e.g. did the system go from green to red?)
- Tasks are registered with the system, and have
  - An id, title, description, execute, the latter is a function which must return a promise
  - If a task accepts input params (most probably will), it can define metadata that describes those params
    - This metadata can be used to build an input form / UI for configuring an instance of a task
  - If the same id is registered more than once, this is an error
  - The execute function is passed a context which includes:
    - params - custom context specified when the task was scheduled, used by the task to modify its behavior (e.g. `{ email: 'me@example.com', monitorIndex: 'bar' }`)
    - previousState
    - callCluster - an elasticsearch connection that has the context of the user who scheduled the task
- REST API
  - The API allows programmatic CRUD of scheudled tasks
  - Users cannot modify tasks created by other users (except, maybe admin-like users)
  - For security reasons, we may restrict excatly what details users can read about other users' scheduled tasks
- Tasks are considered "stuck" if `status === 'running' && nextRun > (2 * interval)`
  - In other words, if a task is scheduled to run every 5 minutes, if the task runs for more than 10 minutes, it is "stuck"
  - If a stuck task is found
    - Update the task (w/ optimistic concurrency)
      - Update `nextRun`
      - Increment `attempts`
    - Write it out to the logs
    - If `attempts` is below threshold, reattempt it
    - If `attempts` is above threshold, log, but no longer reattempt (or maybe we bump out the nextRun to 24 hours or something)
- Task options
  - When a task is scheduled, it can be given data as i
  - Some descriptive metadata about the shape of arguments that can be used to tailor scheduled instances of the task
- Configuration options:
  - `pool_size`: defaults to 10
  - `index`: defaults to "task_manager"
  - `poll_interval`: defaults to 1m
  - `max_retries`: defaults to 3


### Terms

- task - a definition of work that can be configured and scheduled by the task manager
- taskInstance - a configured or scheduled instance of a task


### Scheduled task document

A scheduled task document might look something like this:

```js
{
  interval: '5m', // 5 minutes
  task: 'someplugin.foo', // The id / type of the registered task
  params: '{ "json": "blob", "whatever": "stuff" }', // The input params used to tailor what the task does
  status: 'idle', // The task is not running
  nextRun: '2018-10-20 T02:30:30', // The date + time after which the task will run
  previousState: '{ "status": "offline" }', // The value returned by the previous run
  attempts: 0, // The number of failed attempts to run this task
}
```



## Misc / later work

Later versions might:

- Track task history in e.g. task_history indices
  - These should use the rollover API or similar to keep from growing too large
- Allow addition of custom types of tasks (e.g. something other than one-time or recurring)
- Built-in, scriptable task that allows tasks to be defined via canvas AST w/out the need to write a custom plugin
- More robust healthcheck for any given task
- More complex scheduling abilities (e.g. cron or some extensiblity layer or something)

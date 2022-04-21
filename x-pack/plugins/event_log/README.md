# Event Log

The event log plugin provides a persistent history of alerting and action
activities.

## Overview

This plugin provides a persistent log of "events" that can be used by other
plugins to record their processing for later access. It is used by:

- `alerting` and `actions` plugins
- [work in progress] `security_solution` (detection rules execution log)

The "events" are [ECS documents](https://www.elastic.co/guide/en/ecs/current/index.html)
containing both standard ECS fields and some custom fields for Kibana.

- Standard fields are those which are defined in the ECS specification.
  Examples: `@timestamp`, `message`, `event.provider`. The number of ECS fields
  supported in Event Log is limited today, but can be extended fairly easily.
  We are being conservative in adding new fields though, to help prevent
  indexing explosions.
- Custom fields are not part of the ECS spec. We defined a top-level `kibana`
  field set where we have some Kibana-specific fields like `kibana.server_uuid`
  and `kibana.saved_objects`. Plugins added a few custom fields as well,
  for example `kibana.alerting` field set.

A client API is available for other plugins to:

- register the events they want to write
- write the events, with helpers for `duration` calculation, etc
- query the events
- aggregate the events

HTTP APIs are also available to query the events.

Currently, events are written with references to Saved Objects, and queries
against the event log must include the Saved Object references that the query
should return events for.  This is the basic security mechanism to prevent
users from accessing events for Saved Objects that they do not have access to.
The queries ensure that the user can read the referenced Saved Objects before
returning the events relating to them.

The default index name is `.kibana-event-log-${kibanaVersion}-${ILM-sequence}`.

The index written to is controlled by ILM.  The ILM policy is initially created
by the plugin, but is otherwise never updated by the plugin.  This allows
customers to customize it to their environment, without having to worry about
their updates getting overwritten by newer versions of Kibana.
The policy provides some default phases to roll over and delete older
indices.  The name of the policy is `kibana-event-log-policy`.


## Event Documents

The structure of the event documents can be seen in the
[mappings](generated/mappings.json) and
[config-schema definitions](generated/schemas.ts).  Note these files are
generated via a script when the structure changes.  See the
[README.md](generated/README.md) for how to change the document structure.

Below is a document in the expected structure, with descriptions of the fields:

```js
{
  // Base ECS fields.
  // https://www.elastic.co/guide/en/ecs/current/ecs-base.html
  "@timestamp": "ISO date",
  tags: ["tags", "here"],
  message: "message for humans here",

  // ECS version. This is set by the Event Log and should not be specified
  // by a client of Event Log.
  // https://www.elastic.co/guide/en/ecs/current/ecs-ecs.html
  ecs: {
    version: "version of ECS used by the event log",
  },

  // Event fields. All of them are supported.
  // https://www.elastic.co/guide/en/ecs/current/ecs-event.html
  event: {
    provider: "see below",
    action: "see below",
    start: "ISO date of start time for events that capture a duration",
    duration: "duration in nanoseconds for events that capture a duration",
    end: "ISO date of end time for events that capture a duration",
    outcome: "success | failure, for events that indicate an outcome",
    reason: "additional detail on failure outcome",
    // etc
  },

  // Error fields. All of them are supported.
  // https://www.elastic.co/guide/en/ecs/current/ecs-error.html
  error: {
    message: "an error message, usually associated with outcome: failure",
    // etc
  },

  // Log fields. Only a subset is supported.
  // https://www.elastic.co/guide/en/ecs/current/ecs-log.html
  log: {
    level: "info | warning | any log level keyword you need",
    logger: "name of the logger",
  },

  // Rule fields.
  // https://www.elastic.co/guide/en/ecs/current/ecs-rule.html
  rule: {
    // Fields currently are populated:
    id: "a823fd56-5467-4727-acb1-66809737d943", // rule id
    category: "test", // rule type id
    license: "basic", // rule type minimumLicenseRequired
    name: "rule-name", //
    ruleset: "alerts", // rule type producer
    // Fields currently are not populated:
    author: ["Elastic"],
    description: "Some rule description",
    version: '1',
    uuid: "uuid"
    // etc
  },

  // User fields. Only user.name is supported.
  // https://www.elastic.co/guide/en/ecs/current/ecs-user.html
  user: {
    name: "name of Kibana user",
  }, 

  // Custom fields that are not part of ECS.
  kibana: {
    server_uuid: "UUID of kibana server, for diagnosing multi-Kibana scenarios",
    task: {
      scheduled: "ISO date of when the task for this event was supposed to start",
      schedule_delay: "delay in nanoseconds between when this task was supposed to start and when it actually started",
    },
    alerting: {
      instance_id: "alert id, for relevant documents",
      action_group_id: "alert action group, for relevant documents",
      action_subgroup: "alert action subgroup, for relevant documents",
      status: "overall alert status, after rule  execution",
    },
    saved_objects: [
      {
        rel: "'primary' | undefined; see below",
        namespace: "${spaceId} | undefined",
        id: "saved object id",
        type: "saved object type",
        type_id: "rule type id if saved object type is "alert"",
      },
    ],
    alert: {
      rule: {
        rule_type_id: "rule type id",
        consumer: "rule consumer",
        execution: {
          uuid: "UUID of current rule execution cycle",
          metrics: {
            number_of_triggered_actions: "number of actions scheduled for execution during current rule execution cycle",
            number_of_searches: "number of ES queries issued during current rule execution cycle",
            es_search_duration_ms: "total time spent performing ES searches as measured by Elasticsearch",
            total_search_duration_ms: "total time spent performing ES searches as measured by Kibana; includes network latency and time spent serializing/deserializing request/response",
            total_indexing_duration_ms: "total time spent indexing documents during current rule execution cycle",
            execution_gap_duration_s: "duration in seconds of execution gap"
          }
        }
      }
    },
    version: "7.15.0"
  },
}
```

The `event.provider` and `event.action` fields provide a scoped mechanism for
describing who is generating the event, and what kind of event it is.  Plugins
that write events need to register the `provider` and `action` values they
will be using.  Generally, each plugin should provide it's own `provider`,
but a plugin could provide multiple providers, or a single provider might be
used by multiple plugins.

The following `provider` / `action` pairs are used by the alerting and actions
plugins:

- `provider: actions`
  - `action: execute` - generated when an action is executed by the actions client
  - `action: execute-via-http` - generated when an action is executed via HTTP request

- `provider: alerting`
  - `action: execute` - generated when a rule executor runs
  - `action: execute-action` - generated when a rule schedules an action to run
  - `action: new-instance` - generated when a rule has a new instance id that is active
  - `action: recovered-instance` - generated when a rule has a previously active instance id that is no longer active
  - `action: active-instance` - generated when a rule determines an instance id is active

For the `saved_objects` array elements, these are references to saved objects
associated with the event.  For the `alerting` provider, those are rule saved
ojects and for the `actions` provider those are connector saved objects.  The 
`alerting:execute-action` event includes both the rule and connector saved object
references.  For that event, only the rule reference has the optional `rel`
property with a `primary` value.  This property is used when searching the
event log to indicate which saved objects should be directly searchable via 
saved object references.  For the `alerting:execute-action` event, only searching 
via the rule saved object reference will return the event; searching via the
connector saved object reference will **NOT** return the event.  The 
`actions:execute` event also includes both the rule and connector saved object
references, and both of them have the `rel` property with a `primary` value,
allowing those events to be returned in searches of either the rule or 
connector.


## Event Log index - associated resources

The index template and ILM policy are defined in the file
[`x-pack/plugins/event_log/server/es/documents.ts`](server/es/documents.ts).

See [ILM rollover action docs][] for more information on the `is_write_index`
and `index.lifecycle.*` properties.

[ILM rollover action docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html


## Using the Event Log for diagnosing alerting and actions issues

For ad-hoc diagnostic purposes, your go to tools are Discover and Lens. Your
user will need to have access to the index, which is considered a Kibana
system index due to its prefix.

Add the event log index as a data view.  The only customization needed is
to set the `event.duration` field to a duration in nanoseconds.  You'll
probably want it displayed as milliseconds.


## Experimental RESTful API for querying

As this plugin is space-aware, prefix any URL below with the usual `/s/{space}`
to target a space other than the default space.

Usage of the event log allows you to retrieve the events for a given saved object type by the specified set of IDs.
The following API is experimental and can change or be removed in a future release.

### `GET /internal/event_log/{type}/{id}/_find`: Get events for a given saved object type by the ID

Collects event information from the event log for the selected saved object by type and ID.

Params:

|Property|Description|Type|
|---|---|---|
|type|The type of the saved object whose events you're trying to get.|string|
|id|The id of the saved object.|string|

Query:

|Property|Description|Type|
|---|---|---|
|page|The page number.|number|
|per_page|The number of events to return per page.|number|
|sort|Array of sort fields and order for the response. Each sort object specifies `sort_field` and `sort_order` where `sort_order` is either `asc` or `desc`.|object|
|filter|A KQL string that you filter with an attribute from the event. It should look like `event.action:(execute)`.|string|
|start|The date to start looking for saved object events in the event log. Either an ISO date string, or a duration string that indicates the time since now.|string|
|end|The date to stop looking for saved object events in the event log. Either an ISO date string, or a duration string that indicates the time since now.|string|

Response body:

See `QueryEventsBySavedObjectResult` in the Plugin Client APIs below.

### `POST /internal/event_log/{type}/_find`: Retrive events for a given saved object type by the IDs

Collects event information from the event log for the selected saved object by type and by IDs.

Params:

|Property|Description|Type|
|---|---|---|
|type|The type of the saved object whose events you're trying to get.|string|

Query:

|Property|Description|Type|
|---|---|---|
|page|The page number.|number|
|per_page|The number of events to return per page.|number|
|sort|Array of sort fields and order for the response. Each sort object specifies `sort_field` and `sort_order` where `sort_order` is either `asc` or `desc`.|object|
|filter|A KQL string that you filter with an attribute from the event. It should look like `event.action:(execute)`.|string|
|start|The date to start looking for saved object events in the event log. Either an ISO date string, or a duration string that indicates the time since now.|string|
|end|The date to stop looking for saved object events in the event log. Either an ISO date string, or a duration string that indicates the time since now.|string|

Request Body:

|Property|Description|Type|
|---|---|---|
|ids|The array ids of the saved object.|string array|
|legacyIds|The array legacy ids of the saved object. This filter applies to the rules creted in Kibana versions before 8.0.0.|string array|

Response body:

See `QueryEventsBySavedObjectResult` in the Plugin Client APIs below.


## Plugin Client APIs for querying

```ts
interface EventLogClient {
  findEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<FindOptionsType>,
    legacyIds?: string[]
  ): Promise<QueryEventsBySavedObjectResult>;
  aggregateEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<AggregateOptionsType>,
    legacyIds?: string[]
  ): Promise<AggregateEventsBySavedObjectResult>;
}

interface FindOptionsType { /* typed version of HTTP query parameters ^^^ */ }

interface QueryEventsBySavedObjectResult {
  page: number;
  per_page: number;
  total: number;
  data: Event[];
}

interface AggregateOptionsType {
  start?: Date,
  end?: Date,
  filter?: string;
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
}

interface AggregateEventsBySavedObjectResult {
  aggregations: Record<string, estypes.AggregationsAggregate> | undefined;
}
```

## Generating Events

Follow these steps to use `eventLog` in your plugin: 

1. Declare `eventLog` as a dependency in `kibana.json`:

```json
{
  ...
  "requiredPlugins": ["eventLog"],
  ...
}
```

2. Register provider / actions, and create your plugin's logger, using the
service API provided in the `setup` stage:

```typescript
...
import { IEventLogger, IEventLogService } from '../../event_log/server';
interface PluginSetupDependencies {
  eventLog: IEventLogService;
}
...
public setup(core: CoreSetup, { eventLog }: PluginSetupDependencies) {
  ...
  eventLog.registerProviderActions('my-plugin', ['action-1, action-2']);
  const eventLogger: IEventLogger = eventLog.getLogger({ event: { provider: 'my-plugin' } });
  ...
}
...
```

3. To log an event, call `logEvent()` on the `eventLogger` object you created:

```typescript
...
  eventLogger.logEvent({ event: { action: 'action-1' }, tags: ['fe', 'fi', 'fo'] });
...
```

The plugin exposes an `IEventLogService` object to plugins that pre-req it.
Those plugins need to call `registerProviderActions()` to indicate the values
of the `event.provider` and `event.action` values they will be using
when logging events.

The pre-registration helps in two ways:

- dealing with misspelled values
- preventing index explosion on those fields

Once the values are registered, the plugin will get an `IEventLogger` instance
by passing in a set of default properties to be used for all it's logging,
to the `getLogger()` method. For instance, the `actions` plugin creates a
logger with `event.provider` set to `actions`, and provides `event.action`
values when writing actual entries.

The `IEventLogger` object can be cached at the plugin level and accessed by
any code in the plugin.  It has a single method to write an event log entry,
`logEvent()`, which is passed specific properties for the event.

The final data written is a combination of the data passed to `getLogger()` when
creating the logger, and the data passed on the `logEvent()` call, and then
that result is validated to ensure it's complete and valid.  Errors will be
logged to the server log.

The `logEvent()` method returns no values, and is itself not asynchronous. 
The messages are queued written asynchonously in bulk.  It's designed
this way because it's not clear what a client would do with a result from this
method, nor what it would do if the method threw an error.  All the error
processing involved with getting the data into the index is handled internally,
and logged to the server log as appropriate.

There are additional utility methods `startTiming()` and `stopTiming()` which
can be used to set the timing properties `start`, `end`, and `duration` in the
event.  For example:

```typescript
    const loggedEvent: IEvent = { event: { action: 'foo' } };

    // sets event.start
    eventLogger.startTiming(loggedEvent);

    longRunningFunction();
    
    // sets event.end and event.duration
    eventLogger.stopTiming(loggedEvent);

    eventLogger.logEvent(loggedEvent);

```

It's anticipated that more "helper" methods like this will be provided in the
future.

### Start
```typescript

export interface IEventLogClientService {
  getClient(request: KibanaRequest): IEventLogClient;
}

export interface IEventLogClient {
  findEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<FindOptionsType>,
    legacyIds?: string[]
  ): Promise<QueryEventsBySavedObjectResult>;
  aggregateEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<AggregateOptionsType>,
    legacyIds?: string[]
  ): Promise<AggregateEventsBySavedObjectResult>;
}
```

The plugin exposes an `IEventLogClientService` object to plugins that request it.
These plugins must call `getClient(request)` to get the event log client.

## Testing

### Unit tests

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

```
yarn test:jest x-pack/plugins/event_log --watch
```

### API Integration tests

See: [`x-pack/test/plugin_api_integration/test_suites/event_log`](https://github.com/elastic/kibana/tree/main/x-pack/test/plugin_api_integration/test_suites/event_log).

To develop integration tests, first start the test server from the root of the repo:

```sh
node scripts/functional_tests_server --config x-pack/test/plugin_api_integration/config.ts
```

Then start the test runner:

```sh
node scripts/functional_test_runner --config x-pack/test/plugin_api_integration/config.ts --include x-pack/test/plugin_api_integration/test_suites/event_log/index.ts
```

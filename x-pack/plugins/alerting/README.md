# Kibana alerting

The Kibana alerting plugin provides a common place to setup alerts. It supports:

- Registering types of alerts
- List the registered types of alerts
- CRUD on alerts

## Terminology

**Alert Type**: A function that takes parameters and fires actions to alert instances.

**Alert**: A configuration that defines a schedule, an alert type w/ parameters, state information and actions.

**Alert Instance**: The instance(s) created from an alert type execution.

## Usage

1. Develop and register an alert type (see alert types -> example).
2. Create an alert using the RESTful API (see alerts -> create).

## Alert types

### Methods

**server.plugins.alerting.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the alert type. For convention purposes, ids starting with `.` are reserved for built in alert types. We recommend using a convention like `<plugin_id>.mySpecialAlert` for your alert types to avoid conflicting with another plugin.|string|
|name|A user friendly name for the alert type. These will be displayed in dropdowns when chosing alert types.|string|
|validate.params|When developing an alert type, you can choose to accept a series of parameters. You may also have the parameters validated before they are passed to the `execute` function or created as an alert saved object. In order to do this, provide a joi schema that we will use to validate the `params` attribute.|Joi schema|
|execute|This is where the code of the alert type lives. This is a function to be called when executing an alert on an interval basis. For full details, see executor section below.|Function|

### Executor

This is the primary function for an alert type, whenever the alert needs to execute, this function will perform the execution. It receives a variety of parameters, the following table describes the properties the executor receives.

**execute(options)**

|Property|Description|
|---|---|
|services.callCluster(path, opts)|Use this to do elasticsearch queries on the cluster Kibana connects to. This function is the same as any other `callCluster` in Kibana.<br><br>**NOTE**: This currently authenticates as the Kibana internal user, this will change in a future PR.|
|services.savedObjectsClient|This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>**NOTE**: This currently only works when security is disabled. A future PR will add support for enabled security using Elasticsearch API tokens.|
|services.log(tags, [data], [timestamp])|Use this to create server logs. (This is the same function as server.log)|
|scheduledRunAt|The date and time the alert type execution was scheduled to be called.|
|previousScheduledRunAt|The previous date and time the alert type was scheduled to be called.|
|params|Parameters for the execution. This is where the parameters you require will be passed in. (example threshold). Use alert type validation to ensure values are set before execution.|
|state|State returned from previous execution. This is the alert level state, what is returned by the executor will be serialized and provided here at the next execution.|

### Example

```
server.plugins.alerting.registerType({
  id: 'my-alert-type',
  name: 'My alert type',
  validate: {
    params: Joi.object()
      .keys({
        myParam: Joi.string().required(),
      })
      .required(),
  },
  async execute({
    scheduledRunAt,
    previousScheduledRunAt,
    services,
    params,
    state,
  }: AlertExecuteOptions) {  
    // Use this example to fire a single action
    alertInstanceFactory('server_1')
      .replaceState({
        // Alert instance level state, use getState() for
        // previous and persisted values
        ...
      })
      .fire('default', {
        server: 'server_1',
      });
    
    // Use this example to fire multiple actions
    // This scenario allows a single query and "fan-off" zero, one or many alerts based on the results
    for (const server of ['server_1', 'server_2', 'server_3']) {
      alertInstanceFactory(server)
      	 .replaceState({
      	 	// State specific to "server_x"
      	 	...
      	 })
      	 .fire('default', { server });
    }
    
    // Returning updated alert type level state
    return {
      ...
    };
  },
});
```

## Alerts

Using an alert type requires an alert to be created which will contain parameters and actions for a given alert type.

### RESTful API

#### `POST /api/alert`: Create alert

Payload:

|Property|Description|Type|
|---|---|---|
|alertTypeId|The id value of the alert type you want to call when the alert is scheduled to execute.|string|
|interval|The interval in milliseconds the alert should execute.|number|
|alertTypeParams|The parameters to pass in to the alert type executor `params` value. This will also validate against the alert type params validator if defined.|object|
|actions|Array of the following:<br> - `group` (string): We support grouping actions in the scenario of escalations or different types of alert instances. If you don't need this, feel free to use `default` as a value.<br>- `id` (string): The id of the action saved object to fire.<br>- `params` (object): The map to the `params` the action type will receive. In order to help apply context to strings, we handle them as mustache templates and pass in a default set of context. (see templating actions).|array|

#### `DELETE /api/alert/{id}`: Delete alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to delete.|string|

#### `GET /api/alert/_find`: Find alerts

Params:

See saved objects API documentation for find, all the properties are the same except you cannot pass in `type`.

#### `GET /api/alert/{id}`: Get alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to get.|string|

#### `GET /api/alert/types`: List alert types

No parameters.

#### `PUT /api/alert/{id}`: Update alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to update.|string|

Payload:

|Property|Description|Type|
|---|---|---|
|interval|The interval in milliseconds the alert should execute.|number|
|alertTypeParams|The parameters to pass in to the alert type executor `params` value. This will also validate against the alert type params validator if defined.|object|
|actions|Array of the following:<br> - `group` (string): We support grouping actions in the scenario of escalations or different types of alert instances. If you don't need this, feel free to use `default` as a value.<br>- `id` (string): The id of the action saved object to fire.<br>- `params` (object): There map to the `params` the action type will receive. In order to help apply context to strings, we handle them as mustache templates and pass in a default set of context. (see templating actions).|array|

## Alert instance factory

**alertInstanceFactory(id)**

One service passed in to alert types is an alert instance factory. This factory creates instances of alerts and must be used in order to fire actions. These instances support state persisting between alert type execution but will clear out once the alert instance stops firing.

This factory returns an instance of `AlertInstance`. The alert instance class has the following methods, note that we have removed the methods that you shouldn't touch.

|Method|Description|
|---|---|
|getState()|Get the current state of the alert instance.|
|fire(actionGroup, context)|Called to fire actions. The actionGroup relates to the group of alert `actions` to fire and the context will be used for templating purposes. This should only be called once per alert instance.|
|replaceState(state)|Used to replace the current state of the alert instance. This doesn't work like react, the entire state must be provided. Use this feature as you see fit. The state that is set will persist between alert type executions whenever you re-create an alert instance with the same id. The instance state will be erased when fire isn't called during an execution.|

## Templating actions

There needs to be a way to map alert context into action parameters. For this, we started off by adding template support. Any string within the `params` of an alert saved object's `actions` will be processed as a template and can inject context or state values. 

When an alert instance fires, the first argument is the `group` of actions to fire and the second is the context the alert exposes to templates. We iterate through each action params attributes recursively and render templates if they are a string. Templates have access to the `context` (provided by second argument of `.fire(...)` on an alert instance) and the alert instance's `state` (provided by the most recent `replaceState` call on an alert instance).

### Examples

The following code would be within an alert type. As you can see `cpuUsage ` will replace the state of the alert instance and `server` is the context for the alert instance to fire. The difference between the two is `cpuUsage ` will be accessible at the next execution.

```
alertInstanceFactory('server_1')
  .replaceState({
    cpuUsage: 80,
  })
  .fire('default', {
    server: 'server_1',
  });
```

Below is an example of an alert that takes advantage of templating:

```
{
  ...
  actions: [
    {
      "group": "default",
      "id": "3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5",
      "params": {
        "from": "example@elastic.co",
        "to": "destination@elastic.co",
        "subject": "A notification about {{context.server}}"
        "body": "The server {{context.server}} has a CPU usage of {{state.cpuUsage}}%"
      }
    }
  ]
}
```

The templating system will take the alert and alert type as described above and convert the action parameters to the following:

```
{
  "from": "example@elastic.co",
  "to": "destination@elastic.co",
  "subject": "A notification about server_1"
  "body": "The server server_1 has a CPU usage of 80%"
}
```

There are limitations that we are aware of using only templates, we are gathering feedback and use cases for these. (for example passing an array of strings to an action).

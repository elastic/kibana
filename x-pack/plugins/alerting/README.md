# Kibana alerting

The Kibana alerting plugin provides a common place to setup alerts. It supports:

- Registering types of alerts
- List the registered types of alerts
- CRUD on alerts

## Terminology

**Alert Type**: A function that takes parameters and fires actions to alert instances.

**Alert**: A configuration that defines a schedule, an alert type w/ parameters, state information and actions.

**Alert Instance**: The instances created from the an alert type execution.

## Usage

1. Create an alert type (see alert types -> example).
2. Create an alert using the RESTful API (see alerts -> create).

## Alert types

### Methods

**server.plugins.alerting.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the alert type.|string|
|name|A user friendly name for the alert type.|string|
|validate.params|Joi object validation for the parameters the executor receives.|Joi schema|
|execute|A function to be called when executing an alert. See executor below.|Function|

### Executor

This is the primary function for an alert type, whenever the alert needs to execute, this function will perform the execution. It receives a variety of parameters, the following table describes the properties the executor receives.

**execute(options)**

|Property|Description|
|---|---|
|services.callCluster|Use this to do elasticsearch queries on the cluster Kibana connects to. NOTE: This currently authenticates as the Kibana internal user, this will change in a future PR.|
|services.savedObjectsClient|Use this to manipulate saved objects. NOTE: This currently only works when security is disabled. A future PR will add support for enabled security using Elasticsearch API tokens.|
|services.log|Use this to create server logs. (This is the same function as server.log)|
|scheduledRunAt|The date and time the alert type was supposed to be called.|
|previousScheduledRunAt|The previous date and time the alert type was supposed to be called.|
|params|Parameters for the execution.|
|state|State returned from previous execution.|

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
    // Pass in parameters, also validated
    const {
      myParam
    } = params;

    // Available services
    const {
      log,
      callCluster,
      savedObjectsClient,
      alertInstanceFactory,
    } = services;
  
    // Firing actions
    alertInstanceFactory('server_1')
      .replaceState({
        // Alert instance level state, use getState() for
        // previous and persisted values
        ...
      })
      .fire('default', {
        server: 'server_1',
      });
    
    // Returning updated alert type level state
    return {
      ...
    };
  },
});
```

## Alerts

Using an alert type requires an alert to be created which will contain parameters and actions for a given alert type.

The alerting plugin exposes the following APIs:

#### `POST /api/alert`: Create alert

Payload:

|Property|Description|Type|
|---|---|---|
|alertTypeId|The id value of the alert type you want to call when the alert is scheduled to execute.|string|
|interval|The interval in milliseconds the alert should execute.|number|
|alertTypeParams|The parameters to pass in to the alert type executor `params` value.|object|
|action|An array of `group` (string), `id` (string) and params (object) to fire whenever the alert fires. The group allows the alert type fire fire different groups of actions. For example `warning` and `severe`. The id is the id of the action saved object to use. The params are the `params` value the action type expects. This uses mustache templates recursively on strings. The templates have access to `context` and `state` objects.|array|

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
|alertTypeParams|The parameters to pass in to the alert type executor `params` value.|object|
|action|An array of `group` (string), `id` (string) and params (object) to fire whenever the alert fires. The group allows the alert type fire fire different groups of actions. For example `warning` and `severe`. The id is the id of the action saved object to use. The params are the `params` value the action type expects. This uses mustache templates recursively on strings. The templates have access to `context` and `state` objects.|array|

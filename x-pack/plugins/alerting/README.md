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

Before using alerts, there needs to be an alert type that can execute the alert on an interval basis. For example, beofre being able to check CPU usage, there needs to be a check CPU usage type of alert. (See Alert types -> Example)

Once the alert type exists, the RESTful API can be used to create alerts. (See Alerts -> Create)

## Alert types

Defining an alert type contains the following attributes:

- `id` (string): Unique identifier for the alert type.
- `name` (string): A user friendly name for the alert type.
- `validate` (optional)
  - `params` (optional): Joi object validation
- `execute` (function): A function to be called for executing an alert.

Alert type executors are provided the following as the first argument object:

- `services`:
  - `callCluster`: use this to do elasticsearch queries on the cluster Kibana connects to. NOTE: This currently authenticates as the Kibana internal user, this will change in a future PR.
  - `savedObjectsClient`: use this to manipulate saved objects. NOTE: This currently uses the saved objects repository which bypasses security and user authorization.
  - `log`: use this to create server logs.
  - `alertInstanceFactory`: Use to create instances of alert and fire them
- `scheduledRunAt`: The date and time the alert type was supposed to be called
- `previousScheduledRunAt`: The previous date and time the alert type was supposed to be called
- `params`: Parameters for the execution
- `state`: State returned from previous execution

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

- `alertTypeId` (string)
- `interval` (number)
- `alertTypeParams` (object)
- `actions` (array)
  - `group` (string)
  - `id` (string)
  - `params` (object)

#### `DELETE /api/alert/{id}`: Delete alert

Params:

- `id` (string)

#### `GET /api/alert/_find`: Find alerts

Params:

- `per_page` (optional) (number)
- `page` (optional) (number)
- `search` (optional) (string)
- `default_search_operator` (optional) (string)
- `search_fields` (optional) (array<string>)
- `sort_field` (optional) (string)
- `has_reference` (optional)
  - `type` (string)
  - `id` (string)
- `fields` (optional) (array<string>)

#### `GET /api/alert/{id}`: Get alert

Params:

- `id` (string)

#### `GET /api/alert/types`: List alert types

#### `PUT /api/alert/{id}`: Update alert

Params:

- `id` (string)

Payload:

- `interval` (number)
- `alertTypeParams` (object)
- `actions` (array)
  - `group` (string)
  - `id` (string)
  - `params` (object)

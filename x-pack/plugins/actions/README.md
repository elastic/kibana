# Kibana actions

The Kibana actions plugin provides a common place to execute actions. It supports:

- Registering types of actions
- List the registered types of actions
- Fire actions
- CRUD on actions w/ encrypted configurations

## Terminology

Action Type: A programatically defined integration with another service, with an expected set of configuration and parameters.

Action: A user-defined configuration that satisfies an action type's expected configuration.

## Usage

Before using actions, there needs to be an action type that can handle the type of action you're looking for. For example, before being able to send emails, an email action type must be registered. (see Action types -> Example)

Once the action type exists, an action saved object must be created before firing. The action saved object will contain which action type to use as well as what configuration to pass in at execution time. These actions are created via the RESTful API. (See Actions -> Create action)

Once the action saved object exists, the it can now be fired as many times as you like. (See Firing actions)

## Action types

Defining an action type contains the following attributes:

- `id` (string): Unique identifyer for the action type.
- `name` (string): A user friendly name for the action type.
- `unencryptedAttributes` (array<string>): A list of opt-out attributes that don't need to be encrypted, these attributes won't need to be re-entered on import / export when the feature becomes available.
- `validate` (optional)
  - `params`: (optional) Joi object validation
  - `config` (optional) Joi object validation
- `executor` (function): A function to be called for executing an action.

Action type executors are provided the following:

- `services`:
  - `callCluster`: use this to do elasticsearch queries on the cluster Kibana connects to. NOTE: This currently authenticates as the Kibana internal user, this will change in a future PR.
  - `savedObjectsClient`: use this to manipulate saved objects. NOTE: This currently uses the saved objects repository which bypasses security and user authorization.
  - `log`: use this to create server logs.
- `config`: The decrypted configuration given to an action
- `params`: Parameters for the execution

### Example

```
server.plugins.actions.registerType({
  id: 'my-action',
  name: 'My action',
  unencryptedAttributes: ['unencryptedAttribute'],
  validate: {
    params: Joi.object()
      .keys({
        param1: Joi.string().required(),
        param2: Joi.string().default('value'),
      })
      .required(),
    config: Joi.object()
      .keys({
        param1: Joi.string().required(),
        param2: Joi.string().default('value'),
      })
      .required(),
  },
  async executor({ config, params, services }) {
    // Some execution code here
  },
});
```

## Actions

Using an action type requires an action to be created which will contain and encrypt configuration for a given action type.

### API

#### `POST /api/action`: Create action

Payload:

- `attributes` (object)
  - `description` (string)
  - `actionTypeId` (string)
  - `actionTypeConfig` (object)
- `references` (optional) (array)
  - `name` (string)
  - `type` (string)
  - `id` (string)
- `migrationVersion` (optional) (object)

#### `DELETE /api/action/{id}`: Delete action

Params:

- `id` (string)

#### `GET /api/action/_find`: Find actions

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

#### `GET /api/action/{id}`: Get action

Params:

- `id` (string)

#### `GET /api/action/types` List action types

#### `PUT /api/action/{id}`: Update action

Params:

- `id` (string)

Payload:

- `attributes` (object)
  - `description` (string)
  - `actionTypeConfig` (object)
- `version` (string)
- `references` (optional) (array)
  - `name` (string)
  - `type` (string)
  - `id` (string)

## Firing actions

The plugin exposes a fire function that can be used to fire actions.

### Example

This example makes action `3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5` fire an email. The action plugin will load the saved object and find what action type to call with `params`.

```
server.plugins.actions.fire({
  id: '3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5',
  params: {
    from: 'example@elastic.co',
    to: 'destination@elastic.co',
    subject: 'My email subject',
    body: 'My email body',
  },
  namespace: undefined, // The namespace the action exists within
  basePath: undefined, // Usually `request.getBasePath();`
});
```

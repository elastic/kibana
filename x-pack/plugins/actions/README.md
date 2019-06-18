# Kibana actions

The Kibana actions plugin provides a common place to execute actions. It supports:

- Registering types of actions
- List the registered types of actions
- Fire actions
- CRUD on actions w/ encrypted configurations

## Terminology

**Action Type**: A programatically defined integration with another service, with an expected set of configuration and parameters.

**Action**: A user-defined configuration that satisfies an action type's expected configuration.

## Usage

1. Create an action type (see action types -> example).
2. Create an action by using the RESTful API (see actions -> create action).
3. Use alerts to fire actions or fire manually (see firing actions).

## Action types

### Methods

**server.plugins.actions.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the action type.|string|
|name|A user friendly name for the action type.|string|
|unencryptedAttributes|A list of opt-out attributes that don't need to be encrypted, these attributes won't need to be re-entered on import / export when the feature becomes available.|array of strings|
|validate.params|Joi object validation for the parameters the executor receives.|Joi schema|
|validate.config|Joi object validation for the configuration the executor receives.|Joi schema|
|executor|A function to be called for executing an action. See executor below.|Function|

### Executor

This is the primary function for an action type, whenever the action needs to execute, this function will perform the action. It receives a variety of parameters, the following table describes the properties the executor receives.

**executor(options)**

|Property|Description|
|---|---|
|config|The decrypted configuration given to an action.|
|params|Parameters for the execution.|
|services.callCluster|Use this to do elasticsearch queries on the cluster Kibana connects to. NOTE: This currently authenticates as the Kibana internal user, this will change in a future PR.|
|services.savedObjectsClient|Use this to manipulate saved objects. NOTE: This currently only works when security is disabled. A future PR will add support for enabled security using Elasticsearch API tokens.|
|services.log|Use this to create server logs. (This is the same function as server.log)|

### Example

```
server.plugins.actions.registerType({
  id: 'smtp',
  name: 'Email',
  unencryptedAttributes: ['host', 'port'],
  validate: {
    params: Joi.object()
      .keys({
        to: Joi.array().items(Joi.string()).required(),
        from: Joi.string().required(),
        subject: Joi.string().required(),
        body: Joi.string().required(),
      })
      .required(),
    config: Joi.object()
      .keys({
        host: Joi.string().required(),
        port: Joi.number().default(465),
        username: Joi.string().required(),
        password: Joi.string().required(),
      })
      .required(),
  },
  async executor({ config, params, services }) {
    const transporter = nodemailer. createTransport(config);
    await transporter.sendMail(params);
  },
});
```

## Actions

Using an action type requires an action to be created which will contain and encrypt configuration for a given action type.

### API

#### `POST /api/action`: Create action

Payload:

|Property|Description|Type|
|---|---|---|
|attributes.description|A description to reference and search in the future.|string|
|attributes.actionTypeId|The id value of the action type you want to call when the action executes.|string|
|attributes.actionTypeConfig|The configuration the action type expects.|object|
|references|An array of `name`, `type` and `id`. This is the same as `references` in the saved objects API, see saved objects API documentation.|Array|
|migrationVersion|The version of the most recent migrations. This is the same as `migrationVersion` in the saved objects API, see saved objects API documentation.|object|

#### `DELETE /api/action/{id}`: Delete action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to delete.|string|

#### `GET /api/action/_find`: Find actions

Params:

See saved objects API documentation for find, all the properties are the same except you cannot pass in `type`.

#### `GET /api/action/{id}`: Get action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to get.|string|

#### `GET /api/action/types` List action types

No parameters.

#### `PUT /api/action/{id}`: Update action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to update.|string|

Payload:

|Property|Description|Type|
|---|---|---|
|attributes.description|The action description to reference and search in the future.|string|
|attributes.actionTypeConfig|The configuration the action type expects.|object|
|references|An array of `name`, `type` and `id`. This is the same as `references` in the saved objects API, see saved objects API documentation.|Array|
|version|The document version when read|string|

## Firing actions

The plugin exposes a fire function that can be used to fire actions.

**server.plugins.actions.fire(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|The id of the action you want to fire.|string|
|params|The `params` value to give the action type executor|object|
|namespace|The namespace the action exists within|string|
|basePath|The request's basePath value, usually `request.getBasePath()`|string|

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

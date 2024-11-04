# Kibana Actions

The Kibana actions plugin provides a framework to create executable actions. You can:

- Register an action type and associate a JavaScript function to run when actions
  are generated.
- Get a list of registered action types
- Create an action from an action type and encrypted configuration object.
- Get a list of actions that have been created.
- Trigger an action, passing it a parameter object.
- Perform CRUD operations on actions.

---

Table of Contents

- [Kibana Actions](#kibana-actions)
  - [Terminology](#terminology)
  - [Usage](#usage)
  - [Kibana Actions Configuration](#kibana-actions-configuration)
    - [Configuration Options](#configuration-options)
      - [**allowedHosts** configuration](#allowedhosts-configuration)
    - [Configuration Utilities](#configuration-utilities)
  - [Action types](#action-types)
    - [Methods](#methods)
    - [Executor](#executor)
    - [Example](#example)
  - [RESTful API](#restful-api)
  - [Firing actions](#firing-actions)
    - [Accessing a scoped ActionsClient](#accessing-a-scoped-actionsclient)
    - [actionsClient.enqueueExecution(options)](#actionsclientenqueueexecutionoptions)
      - [Example](#example-1)
    - [actionsClient.execute(options)](#actionsclientexecuteoptions)
      - [Example](#example-2)
- [Command Line Utility](#command-line-utility)

## Terminology

**Action Type**: A programatically defined integration with another service, with an expected set of configuration and parameters properties, typically defined with a schema. Plugins can add new
action types.

**Action**: A configuration object associated with an action type, that is ready to run. The configuration is persisted via Saved Objects, and some/none/all of the configuration properties can be stored encrypted.

## Usage

1. Develop and register an action type (see [Action types -> Example](#example)).
2. Create an action by using the [RESTful API](#restful-api).
3. Use alerting rules to generate actions or trigger them manually (see [Firing actions](#firing-actions)).

## Kibana Actions Configuration

Implemented under the [Actions Config](./server/actions_config.ts).

### Configuration Options

Built-In-Actions are configured using the _xpack.actions_ namespace under _kibana.yml_. See the [Actions configuration Documentation](https://www.elastic.co/guide/en/kibana/master/defining-alerts.html#actions-configuration) for all configuration options.

#### **allowedHosts** configuration

- You can use the string "*" in the **allowedHosts** configuration in place of a specific hostname to enable Kibana to target any URL, but keep in mind the potential to use such a feature to launch [SSRF](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery) attacks from your server.


- The **allowedHosts** configuration applies to built-in action types (such as Slack and PagerDuty). While the _PagerDuty Action Type_ has been configured to support the service's Events API (at _https://events.pagerduty.com/v2/enqueue_, which you can read about in [Pagerduty's documentation](https://v2.developer.pagerduty.com/docs/events-api-v2)), the PagerDuty domain must still be included in the allowedHosts configuration before the action can be used.

### Configuration Utilities

This module provides utilities for interacting with the configuration.

| Method                                  | Arguments                                                    | Description                                                                                                                                                                                                                                                                                 | Return Type                                         |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| isUriAllowed                            | _uri_: The URI you wish to validate is allowed               | Validates whether the URI is allowed. This checks the configuration and validates that the hostname of the URI is in the list of allowed Hosts and returns `true` if it is allowed. If the configuration says that all URI's are allowed (using an "\*") then it will always return `true`. | Boolean                                             |
| isHostnameAllowed                       | _hostname_: The Hostname you wish to validate is allowed     | Validates whether the Hostname is allowed. This checks the configuration and validates that the hostname is in the list of allowed Hosts and returns `true` if it is allowed. If the configuration says that all Hostnames are allowed (using an "\*") then it will always return `true`.   | Boolean                                             |
| isActionTypeEnabled                     | _actionType_: The actionType to check to see if it's enabled | Returns true if the actionType is enabled, otherwise false.                                                                                                                                                                                                                                 | Boolean                                             |
| ensureUriAllowed                        | _uri_: The URI you wish to validate is allowed               | Validates whether the URI is allowed. This checks the configuration and validates that the hostname of the URI is in the list of allowed Hosts and throws an error if it is not allowed. If the configuration says that all URI's are allowed (using an "\*") then it will never throw.     | No return value, throws if URI isn't allowed        |
| ensureHostnameAllowed                   | _hostname_: The Hostname you wish to validate is allowed     | Validates whether the Hostname is allowed. This checks the configuration and validates that the hostname is in the list of allowed Hosts and throws an error if it is not allowed. If the configuration says that all Hostnames are allowed (using an "\*") then it will never throw        | No return value, throws if Hostname isn't allowed . |
| ensureActionTypeEnabled                 | _actionType_: The actionType to check to see if it's enabled | Throws an error if the actionType is not enabled                                                                                                                                                                                                                                            | No return value, throws if actionType isn't enabled |
| isRejectUnauthorizedCertificatesEnabled | _none_                                                       | Returns value of `rejectUnauthorized` from configuration.                                                                                                                                                                                                                                   | Boolean                                             |
| getProxySettings                        | _none_                                                       | If `proxyUrl` is set in the configuration, returns the proxy settings `proxyUrl`, `proxyHeaders` and `proxyRejectUnauthorizedCertificates`. Otherwise returns _undefined_.                                                                                                                  | Undefined or ProxySettings                          |

## Action types

### Methods

**server.plugins.actions.setup.registerType (options)**

The following table describes the properties of the `options` object.

| Property                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Type                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| id                       | Unique identifier for the action type. For convention, ids starting with `.` are reserved for built in action types. We recommend using a convention like `<plugin_id>.mySpecialAction` for your action types.                                                                                                                                                                                                                                                                                                                                                                                       | string                       |
| name                     | A user-friendly name for the action type. These will be displayed in dropdowns when chosing action types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | string                       |
| maxAttempts              | The maximum number of times this action will attempt to run when scheduled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | number                       |
| minimumLicenseRequired   | The license required to use the action type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | string                       |
| supportedFeatureIds   | List of IDs of the features that this action type is available in. Allowed values are `alerting`, `siem`, `uptime`, `cases`. See  `x-pack/plugins/actions/common/connector_feature_config.ts` for the most up to date list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | string[]                       |
| validate.params          | When developing an action type, it needs to accept parameters to know what to do with the action. (Example `to`, `from`, `subject`, `body` of an email). See the current built-in email action type for an example of the state-of-the-art validation. <p>Technically, the value of this property should have a property named `validate()` which is a function that takes a params object to validate and returns a sanitized version of that object to pass to the execution function. Validation errors should be thrown from the `validate()` function and will be available as an error message | schema / validation function |
| validate.config          | Similar to params, a config may be required when creating an action (for example `host` and `port` for an email server).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | schema / validation function |
| validate.secrets         | Similar to params, a secrets object may be required when creating an action (for example `user` and `password` for an email server).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | schema / validation function |
| executor                 | This is where the code of an action type lives. This is a function gets called for generating an action from either alerting or manually by using the exposed function (see firing actions). For full details, see executor section below.                                                                                                                                                                                                                                                                                                                                                           | Function                     |
| preSaveHook              | This optional function is called before the connector saved object is saved.  For full details, see hooks section below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Function                     |
| postSaveHook             | This optional function is called after the connector saved object is saved.  For full details, see hooks section below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Function                     |
| postDeleteHook           | This optional function is called after the connector saved object is deleted.  For full details, see hooks section below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Function                     |
| renderParameterTemplates | Optionally define a function to provide custom rendering for this action type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Function                     |

**Important** - The config object is persisted in ElasticSearch and updated via the ElasticSearch update document API. This API allows "partial updates" - and this can cause issues with the encryption used on specified properties. So, a `validate()` function should return values for all configuration properties, so that partial updates do not occur. Setting property values to `null` rather than `undefined`, or not including a property in the config object, is all you need to do to ensure partial updates won't occur.

### Executor

This is the primary function for an action type. Whenever the action needs to run, this function will perform the action. It receives a variety of parameters. The following table describes the properties that the executor receives.

**executor(options)**

| Property                                | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| actionId                                | The action saved object id that the connector is generating.                                                                                                                                                                                                                                                                                                                           |
| config                                  | The action configuration. If you would like to validate the config before being passed to the executor, define `validate.config` within the action type.                                                                                                                                                                                                                                    |
| secrets                                 | The decrypted secrets object given to an action. This comes from the action saved object that is partially or fully encrypted within the data store. If you would like to validate the secrets object before being passed to the executor, define `validate.secrets` within the action type.                                                                                                |
| params                                  | Parameters for the action. These will be given at run time by either an alert or manually provided when calling the plugin provided execute function.                                                                                                                                                                                                                              |
| services.scopedClusterClient            | Use this to do Elasticsearch queries on the cluster Kibana connects to. Serves the same purpose as the normal IClusterClient, but exposes an additional `asCurrentUser` method that doesn't use credentials of the Kibana internal user (as `asInternalUser` does) to request Elasticsearch API, but rather passes HTTP headers extracted from the current user request to the API instead. |
| services.savedObjectsClient             | This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>The scope of the saved objects client is tied to the user in context calling the execute API or the API key provided to the execute plugin function (only when security isenabled).                                             |
| services.log(tags, [data], [timestamp]) | Use this to create server logs. (This is the same function as server.log)                                                                                                                                                                                                                                                                                                                   |

### Hooks

Hooks allow a connector implementation to be called during connector creation, update, and delete.  When not using hooks, the connector implementation is not involved in creation, update and delete, except for the schema validation that happens for creation and update.  Hooks can be used to force a create or update to fail, or run arbitrary code before and after update and create, and after delete.  We don't have a need for a hook before delete at the moment, so that hook is currently not available.

Hooks are passed the following parameters:

```ts
interface PreSaveConnectorHookParams<Config, Secrets> {
  connectorId: string;
  config: Config;
  secrets: Secrets;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
  isUpdate: boolean;
}

interface PostSaveConnectorHookParams<Config, Secrets> {
  connectorId: string;
  config: Config;
  secrets: Secrets;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
  isUpdate: boolean;
  wasSuccessful: boolean;
}

interface PostDeleteConnectorHookParams<Config, Secrets> {
  connectorId: string;
  config: Config;
  // secrets not provided, yet
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
}
```

| parameter       | description
| ---------       | -----------
| `connectorId`   | The id of the connector. 
| `config`        | The connector's `config` object.
| `secrets`       | The connector's `secrets` object.
| `logger`        | A standard Kibana logger.
| `request`       | The request causing this operation
| `services`      | Common service objects, see below.
| `isUpdate`      | For the `PreSave` and `PostSave` hooks, `isUpdate` is false for create operations, and true for update operations.
| `wasSuccessful` | For the `PostSave` hook, this indicates if the connector was persisted as a Saved Object successfully.

The `services` object contains the following properties:

| property               | description
| ---------              | -----------
| `scopedClusterClient`  | A standard `scopeClusterClient` object.

The hooks are called just before, and just after, the Saved Object operation for the client methods is invoked.

The `PostDelete` hook does not have a `wasSuccessful` property, as the hook is not called if the delete operation fails.  The saved object will still exist.  Only a successful call to delete the connector will cause the hook to run.

The `PostSave` hook is useful if the `PreSave` hook is creating / modifying other resources.  The `PreSave` hook is called just before the connector SO is actually created/updated, and of course that create/update could fail for some reason.  In those cases, the `PostSave` hook is passed `wasSuccessful: false` and can "undo" any work it did in the `PreSave` hook.

The `PreSave` hook can be used to cancel a create or update, by throwing an exception.  The `PostSave` and `PostDelete` invocations will have thrown exceptions caught and logged to the Kibana log, and will not cancel the operation.  

When throwing an error in the `PreSave` hook, the Error's message will be used as the error failing the operation, so should include a human-readable description of what it was doing, along with any message from an underlying API that failed, if available.  When an error is thrown from a `PreSave` hook, the `PostSave` hook will **NOT** be run.

### Example

The built-in email action type provides a good example of creating an action type with non-trivial configuration and params:
[x-pack/plugins/actions/server/builtin_action_types/email.ts](server/builtin_action_types/email.ts)

## RESTful API

Using an action type requires an action to be created that will contain and encrypt configuration for a given action type. See the [REST API Documentation](https://www.elastic.co/guide/en/kibana/master/actions-and-connectors-api.html) API for CRUD operations for Actions.

## Firing actions

Running actions is possible by using the ActionsClient which is provided by the `getActionsClientWithRequest` function part of the plugin's Start Contract.
By providing the user's Request you'll receive an instance of the ActionsClient which is tailered to the current user and is scoped to the resources the user is authorized to access.

### Accessing a scoped ActionsClient

```
const actionsClient = server.plugins.actions.getActionsClientWithRequest(request);
```

Once you have a scoped ActionsClient you can generate an action by calling either the `enqueueExecution` which will schedule the action to run later or the `execute` apis which will run it immediately and return the result respectively.

### actionsClient.enqueueExecution(options)

This api schedules a task which will run the action using the current user scope at the soonest opportunity.

Running the action by scheduling a task means that we will no longer have a user request by which to ascertain the action's privileges and so you might need to provide these yourself:

- The **spaceId** in which the user's action is expected to run
- When security is enabled you'll also need to provide an **apiKey** which allows us to mimic the user and their privileges.

The following table describes the properties of the `options` object.

| Property | Description                                                                                            | Type             |
| -------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| id       | The id of the action you want to run.                                                              | string           |
| params   | The `params` value to give the action type executor.                                                   | object           |
| spaceId  | The space id the action is within.                                                                     | string           |
| apiKey   | The Elasticsearch API key to use for context. (Note: only required and used when security is enabled). | string           |
| source   | The source of the execution, either an HTTP request or a reference to a Saved Object.                  | object, optional |

#### Example

This example makes action `3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5` send an email. The action plugin will load the saved object and find what action type to call with `params`.

```typescript
const request: KibanaRequest = { ... };
const actionsClient = await server.plugins.actions.getActionsClientWithRequest(request);
await actionsClient.enqueueExecution({
  id: '3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5',
  spaceId: 'default', // The spaceId of the action
  params: {
    from: 'example@elastic.co',
    to: ['destination@elastic.co'],
    subject: 'My email subject',
    body: 'My email body',
  },
  source: asHttpRequestExecutionSource(request),
});
```

### actionsClient.execute(options)

This api runs the action and asynchronously returns the result of running the action.

The following table describes the properties of the `options` object.

| Property | Description                                                                           | Type             |
| -------- | ------------------------------------------------------------------------------------- | ---------------- |
| id       | The id of the action you want to generate.                                             | string           |
| params   | The `params` value to give the action type executor.                                  | object           |
| source   | The source of the execution, either an HTTP request or a reference to a Saved Object. | object, optional |

#### Example

As with the previous example, we'll use the action `3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5` to send an email.

```typescript
const actionsClient = await server.plugins.actions.getActionsClientWithRequest(request);
const result = await actionsClient.execute({
  id: '3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5',
  params: {
    from: 'example@elastic.co',
    to: ['destination@elastic.co'],
    subject: 'My email subject',
    body: 'My email body',
  },
  source: asSavedObjectExecutionSource({
    id: '573891ae-8c48-49cb-a197-0cd5ec34a88b',
    type: 'alert',
  }),
});
```
# Command Line Utility

The [`kbn-action`](https://github.com/pmuellr/kbn-action) tool can be used to send HTTP requests to the Actions plugin. For instance, to create a Slack action from the `.slack` Action Type, use the following command:

```console
$ kbn-action create .slack "post to slack" '{"webhookUrl": "https://hooks.slack.com/services/T0000/B0000/XXXX"}'
{
    "type": "action",
    "id": "d6f1e228-1806-4a72-83ac-e06f3d5c2fbe",
    "attributes": {
        "actionTypeId": ".slack",
        "name": "post to slack",
        "config": {}
    },
    "references": [],
    "updated_at": "2019-06-26T17:55:42.728Z",
    "version": "WzMsMV0="
}
```

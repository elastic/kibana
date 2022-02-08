# Kibana Actions

The Kibana actions plugin provides a framework to create executable actions. You can:

- Register an action type and associate a JavaScript function to run when actions
  are executed.
- Get a list of registered action types
- Create an action from an action type and encrypted configuration object.
- Get a list of actions that have been created.
- Execute an action, passing it a parameter object.
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
- [Built-in Action Types](#built-in-action-types)
  - [ServiceNow ITSM](#servicenow-itsm)
    - [`params`](#params)
      - [`subActionParams (pushToService)`](#subactionparams-pushtoservice)
      - [`subActionParams (getFields)`](#subactionparams-getfields)
      - [`subActionParams (getIncident)`](#subactionparams-getincident)
      - [`subActionParams (getChoices)`](#subactionparams-getchoices)
  - [ServiceNow Sec Ops](#servicenow-sec-ops)
    - [`params`](#params-1)
      - [`subActionParams (pushToService)`](#subactionparams-pushtoservice-1)
      - [`subActionParams (getFields)`](#subactionparams-getfields-1)
      - [`subActionParams (getIncident)`](#subactionparams-getincident-1)
      - [`subActionParams (getChoices)`](#subactionparams-getchoices-1)
  - [ServiceNow ITOM](#servicenow-itom)
    - [`params`](#params-2)
      - [`subActionParams (addEvent)`](#subactionparams-addevent)
      - [`subActionParams (getChoices)`](#subactionparams-getchoices-2)
  - [Jira](#jira)
    - [`params`](#params-3)
      - [`subActionParams (pushToService)`](#subactionparams-pushtoservice-2)
      - [`subActionParams (getIncident)`](#subactionparams-getincident-2)
      - [`subActionParams (issueTypes)`](#subactionparams-issuetypes)
      - [`subActionParams (fieldsByIssueType)`](#subactionparams-fieldsbyissuetype)
      - [`subActionParams (issues)`](#subactionparams-issues)
      - [`subActionParams (issue)`](#subactionparams-issue)
      - [`subActionParams (getFields)`](#subactionparams-getfields-2)
  - [IBM Resilient](#ibm-resilient)
    - [`params`](#params-4)
      - [`subActionParams (pushToService)`](#subactionparams-pushtoservice-3)
      - [`subActionParams (getFields)`](#subactionparams-getfields-3)
      - [`subActionParams (incidentTypes)`](#subactionparams-incidenttypes)
      - [`subActionParams (severity)`](#subactionparams-severity)
  - [Swimlane](#swimlane)
    - [`params`](#params-5)
  - [| severity    | The severity of the incident.    | string _(optional)_ |](#-severity-----the-severity-of-the-incident-----string-optional-)
- [Command Line Utility](#command-line-utility)
- [Developing New Action Types](#developing-new-action-types)
  - [licensing](#licensing)
  - [plugin location](#plugin-location)
  - [documentation](#documentation)
  - [tests](#tests)
  - [action type config and secrets](#action-type-config-and-secrets)
  - [user interface](#user-interface)

## Terminology

**Action Type**: A programatically defined integration with another service, with an expected set of configuration and parameters properties, typically defined with a schema. Plugins can add new
action types.

**Action**: A configuration object associated with an action type, that is ready to be executed. The configuration is persisted via Saved Objects, and some/none/all of the configuration properties can be stored encrypted.

## Usage

1. Develop and register an action type (see [Action types -> Example](#example)).
2. Create an action by using the [RESTful API](#restful-api).
3. Use alerts to execute actions or execute manually (see [Firing actions](#firing-actions)).

## Kibana Actions Configuration

Implemented under the [Actions Config](./server/actions_config.ts).

### Configuration Options

Built-In-Actions are configured using the _xpack.actions_ namespace under _kibana.yml_. See the [Actions configuration Documentation](https://www.elastic.co/guide/en/kibana/master/defining-alerts.html#actions-configuration) for all configuration options.

#### **allowedHosts** configuration

- You can use the string "*" in the **allowedHosts** configuration in place of a specific hostname to enable Kibana to target any URL, but keep in mind the potential to use such a feature to execute [SSRF](https://www.owasp.org/index.php/Server_Side_Request_Forgery) attacks from your server.

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
| maxAttempts              | The maximum number of times this action will attempt to execute when scheduled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | number                       |
| minimumLicenseRequired   | The license required to use the action type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | string                       |
| validate.params          | When developing an action type, it needs to accept parameters to know what to do with the action. (Example `to`, `from`, `subject`, `body` of an email). See the current built-in email action type for an example of the state-of-the-art validation. <p>Technically, the value of this property should have a property named `validate()` which is a function that takes a params object to validate and returns a sanitized version of that object to pass to the execution function. Validation errors should be thrown from the `validate()` function and will be available as an error message | schema / validation function |
| validate.config          | Similar to params, a config may be required when creating an action (for example `host` and `port` for an email server).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | schema / validation function |
| validate.secrets         | Similar to params, a secrets object may be required when creating an action (for example `user` and `password` for an email server).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | schema / validation function |
| executor                 | This is where the code of an action type lives. This is a function gets called for executing an action from either alerting or manually by using the exposed function (see firing actions). For full details, see executor section below.                                                                                                                                                                                                                                                                                                                                                            | Function                     |
| renderParameterTemplates | Optionally define a function to provide custom rendering for this action type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Function                     |

**Important** - The config object is persisted in ElasticSearch and updated via the ElasticSearch update document API. This API allows "partial updates" - and this can cause issues with the encryption used on specified properties. So, a `validate()` function should return values for all configuration properties, so that partial updates do not occur. Setting property values to `null` rather than `undefined`, or not including a property in the config object, is all you need to do to ensure partial updates won't occur.

### Executor

This is the primary function for an action type. Whenever the action needs to execute, this function will perform the action. It receives a variety of parameters. The following table describes the properties that the executor receives.

**executor(options)**

| Property                                | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| actionId                                | The action saved object id that the action type is executing for.                                                                                                                                                                                                                                                                                                                           |
| config                                  | The action configuration. If you would like to validate the config before being passed to the executor, define `validate.config` within the action type.                                                                                                                                                                                                                                    |
| secrets                                 | The decrypted secrets object given to an action. This comes from the action saved object that is partially or fully encrypted within the data store. If you would like to validate the secrets object before being passed to the executor, define `validate.secrets` within the action type.                                                                                                |
| params                                  | Parameters for the execution. These will be given at execution time by either an alert or manually provided when calling the plugin provided execute function.                                                                                                                                                                                                                              |
| services.scopedClusterClient            | Use this to do Elasticsearch queries on the cluster Kibana connects to. Serves the same purpose as the normal IClusterClient, but exposes an additional `asCurrentUser` method that doesn't use credentials of the Kibana internal user (as `asInternalUser` does) to request Elasticsearch API, but rather passes HTTP headers extracted from the current user request to the API instead. |
| services.savedObjectsClient             | This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>The scope of the saved objects client is tied to the user in context calling the execute API or the API key provided to the execute plugin function (only when security isenabled).                                             |
| services.log(tags, [data], [timestamp]) | Use this to create server logs. (This is the same function as server.log)                                                                                                                                                                                                                                                                                                                   |

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

Once you have a scoped ActionsClient you can execute an action by caling either the `enqueueExecution` which will schedule the action to run later or the `execute` apis which will run it immediately and return the result respectively.

### actionsClient.enqueueExecution(options)

This api schedules a task which will run the action using the current user scope at the soonest opportunity.

Running the action by scheduling a task means that we will no longer have a user request by which to ascertain the action's privileges and so you might need to provide these yourself:

- The **spaceId** in which the user's action is expected to run
- When security is enabled you'll also need to provide an **apiKey** which allows us to mimic the user and their privileges.

The following table describes the properties of the `options` object.

| Property | Description                                                                                            | Type             |
| -------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| id       | The id of the action you want to execute.                                                              | string           |
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
| id       | The id of the action you want to execute.                                             | string           |
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

# Built-in Action Types

Kibana ships with a set of built-in action types. See [Actions and connector types Documentation](https://www.elastic.co/guide/en/kibana/master/action-types.html).

In addition to the documented configurations, several built in action type offer additional `params` configurations.

## ServiceNow ITSM

The [ServiceNow ITSM user documentation `params`](https://www.elastic.co/guide/en/kibana/master/servicenow-action-type.html) lists configuration properties for the `pushToService` subaction. In addition, several other subaction types are available.
### `params`

| Property        | Description                                                                                        | Type   |
| --------------- | -------------------------------------------------------------------------------------------------- | ------ |
| subAction       | The subaction to perform. It can be `pushToService`, `getFields`, `getIncident`, and `getChoices`. | string |
| subActionParams | The parameters of the subaction.                                                                   | object |

#### `subActionParams (pushToService)`

| Property | Description                                                                                                   | Type                  |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| incident | The ServiceNow incident.                                                                                      | object                |
| comments | The comments of the case. A comment is of the form `{ commentId: string, version: string, comment: string }`. | object[] _(optional)_ |

The following table describes the properties of the `incident` object.

| Property            | Description                                                                                                      | Type                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- |
| short_description   | The title of the incident.                                                                                       | string              |
| description         | The description of the incident.                                                                                 | string _(optional)_ |
| externalId          | The ID of the incident in ServiceNow. If present, the incident is updated. Otherwise, a new incident is created. | string _(optional)_ |
| severity            | The severity in ServiceNow.                                                                                      | string _(optional)_ |
| urgency             | The urgency in ServiceNow.                                                                                       | string _(optional)_ |
| impact              | The impact in ServiceNow.                                                                                        | string _(optional)_ |
| category            | The category in ServiceNow.                                                                                      | string _(optional)_ |
| subcategory         | The subcategory in ServiceNow.                                                                                   | string _(optional)_ |
| correlation_id      | The correlation id of the incident.                                                                              | string _(optional)_ |
| correlation_display | The correlation display of the ServiceNow.                                                                       | string _(optional)_ |

#### `subActionParams (getFields)`

No parameters for the `getFields` subaction. Provide an empty object `{}`.

#### `subActionParams (getIncident)`

| Property   | Description                           | Type   |
| ---------- | ------------------------------------- | ------ |
| externalId | The ID of the incident in ServiceNow. | string |


#### `subActionParams (getChoices)`

| Property | Description                                        | Type     |
| -------- | -------------------------------------------------- | -------- |
| fields   | An array of fields. Example: `[category, impact]`. | string[] |

---

## ServiceNow Sec Ops

The [ServiceNow SecOps user documentation `params`](https://www.elastic.co/guide/en/kibana/master/servicenow-sir-action-type.html) lists configuration properties for the `pushToService` subaction. In addition, several other subaction types are available.

### `params`

| Property        | Description                                                                                        | Type   |
| --------------- | -------------------------------------------------------------------------------------------------- | ------ |
| subAction       | The subaction to perform. It can be `pushToService`, `getFields`, `getIncident`, and `getChoices`. | string |
| subActionParams | The parameters of the subaction.                                                                   | object |

#### `subActionParams (pushToService)`

| Property | Description                                                                                                   | Type                  |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| incident | The ServiceNow security incident.                                                                             | object                |
| comments | The comments of the case. A comment is of the form `{ commentId: string, version: string, comment: string }`. | object[] _(optional)_ |

The following table describes the properties of the `incident` object.

| Property            | Description                                                                                                                                 | Type                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| short_description   | The title of the security incident.                                                                                                         | string                            |
| description         | The description of the security incident.                                                                                                   | string _(optional)_               |
| externalId          | The ID of the security incident in ServiceNow. If present, the security incident is updated. Otherwise, a new security incident is created. | string _(optional)_               |
| priority            | The priority in ServiceNow.                                                                                                                 | string _(optional)_               |
| dest_ip             | A list of destination IPs related to the security incident. The IPs will be added as observables to the security incident.                  | (string \| string[]) _(optional)_ |
| source_ip           | A list of source IPs related to the security incident. The IPs will be added as observables to the security incident.                       | (string \| string[]) _(optional)_ |
| malware_hash        | A list of malware hashes related to the security incident. The hashes  will be added as observables to the security incident.               | (string \| string[]) _(optional)_ |
| malware_url         | A list of malware URLs related to the security incident. The URLs will be added as observables to the security incident.                    | (string \| string[]) _(optional)_ |
| category            | The category in ServiceNow.                                                                                                                 | string _(optional)_               |
| subcategory         | The subcategory in ServiceNow.                                                                                                              | string _(optional)_               |
| correlation_id      | The correlation id of the security incident.                                                                                                | string _(optional)_               |
| correlation_display | The correlation display of the security incident.                                                                                           | string _(optional)_               |

#### `subActionParams (getFields)`

No parameters for the `getFields` subaction. Provide an empty object `{}`.

#### `subActionParams (getIncident)`

| Property   | Description                                    | Type   |
| ---------- | ---------------------------------------------- | ------ |
| externalId | The ID of the security incident in ServiceNow. | string |


#### `subActionParams (getChoices)`

| Property | Description                                          | Type     |
| -------- | ---------------------------------------------------- | -------- |
| fields   | An array of fields. Example: `[priority, category]`. | string[] |

---
## ServiceNow ITOM

The [ServiceNow ITOM user documentation `params`](https://www.elastic.co/guide/en/kibana/master/servicenow-itom-action-type.html) lists configuration properties for the `addEvent` subaction. In addition, several other subaction types are available.
### `params`

| Property        | Description                                                       | Type   |
| --------------- | ----------------------------------------------------------------- | ------ |
| subAction       | The subaction to perform. It can be `addEvent`, and `getChoices`. | string |
| subActionParams | The parameters of the subaction.                                  | object |

#### `subActionParams (addEvent)`


| Property        | Description                                                                                                                      | Type                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| source          | The name of the event source type.                                                                                               | string _(optional)_ |
| event_class     | Specific instance of the source.                                                                                                 | string _(optional)_ |
| resource        | The name of the resource.                                                                                                        | string _(optional)_ |
| node            | The Host that the event was triggered for.                                                                                       | string _(optional)_ |
| metric_name     | Name of the metric.                                                                                                              | string _(optional)_ |
| type            | The type of event.                                                                                                               | string _(optional)_ |
| severity        | The category in ServiceNow.                                                                                                      | string _(optional)_ |
| description     | The subcategory in ServiceNow.                                                                                                   | string _(optional)_ |
| additional_info | Any additional information about the event.                                                                                      | string _(optional)_ |
| message_key     | This value is used for de-duplication of events. All actions sharing this key will be associated with the same ServiceNow alert. | string _(optional)_ |
| time_of_event   | The time of the event.                                                                                                           | string _(optional)_ |

Refer to [ServiceNow documentation](https://docs.servicenow.com/bundle/rome-it-operations-management/page/product/event-management/task/send-events-via-web-service.html) for more information about the properties.

#### `subActionParams (getChoices)`

| Property | Description                                | Type     |
| -------- | ------------------------------------------ | -------- |
| fields   | An array of fields. Example: `[severity]`. | string[] |

---
## Jira

The [Jira user documentation `params`](https://www.elastic.co/guide/en/kibana/master/jira-action-type.html) lists configuration properties for the `pushToService` subaction. In addition, several other subaction types are available.
### `params`

| Property        | Description                                                                                                                                | Type   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| subAction       | The subaction to perform. It can be `pushToService`, `getIncident`, `issueTypes`, `fieldsByIssueType`, `issues`, `issue`, and `getFields`. | string |
| subActionParams | The parameters of the subaction.                                                                                                           | object |

#### `subActionParams (pushToService)`

| Property | Description                                                                                                   | Type                  |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| incident | The Jira incident.                                                                                            | object                |
| comments | The comments of the case. A comment is of the form `{ commentId: string, version: string, comment: string }`. | object[] _(optional)_ |

The following table describes the properties of the `incident` object.

| Property    | Description                                                                                             | Type                  |
| ----------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| summary     | The title of the issue.                                                                                 | string                |
| description | The description of the issue.                                                                           | string _(optional)_   |
| externalId  | The ID of the issue in Jira. If present, the incident is updated. Otherwise, a new incident is created. | string _(optional)_   |
| issueType   | The ID of the issue type in Jira.                                                                       | string _(optional)_   |
| priority    | The name of the priority in Jira. Example: `Medium`.                                                    | string _(optional)_   |
| labels      | An array of labels. Labels cannot contain spaces.                                                       | string[] _(optional)_ |
| parent      | The ID or key of the parent issue. Only for `Sub-task` issue types.                                     | string _(optional)_   |

#### `subActionParams (getIncident)`

| Property   | Description                  | Type   |
| ---------- | ---------------------------- | ------ |
| externalId | The ID of the issue in Jira. | string |

#### `subActionParams (issueTypes)`

No parameters for the `issueTypes` subaction. Provide an empty object `{}`.

#### `subActionParams (fieldsByIssueType)`

| Property | Description                       | Type   |
| -------- | --------------------------------- | ------ |
| id       | The ID of the issue type in Jira. | string |

#### `subActionParams (issues)`

| Property | Description              | Type   |
| -------- | ------------------------ | ------ |
| title    | The title to search for. | string |

#### `subActionParams (issue)`

| Property | Description                  | Type   |
| -------- | ---------------------------- | ------ |
| id       | The ID of the issue in Jira. | string |

#### `subActionParams (getFields)`

No parameters for the `getFields` subaction. Provide an empty object `{}`.

---

## IBM Resilient

The [IBM Resilient user documentation `params`](https://www.elastic.co/guide/en/kibana/master/resilient-action-type.html) lists configuration properties for the `pushToService` subaction. In addition, several other subaction types are available.

### `params`

| Property        | Description                                                                                       | Type   |
| --------------- | ------------------------------------------------------------------------------------------------- | ------ |
| subAction       | The subaction to perform. It can be `pushToService`, `getFields`, `incidentTypes`, and `severity. | string |
| subActionParams | The parameters of the subaction.                                                                  | object |

#### `subActionParams (pushToService)`

| Property | Description                                                                                                   | Type                  |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| incident | The IBM Resilient incident.                                                                                   | object                |
| comments | The comments of the case. A comment is of the form `{ commentId: string, version: string, comment: string }`. | object[] _(optional)_ |

The following table describes the properties of the `incident` object.

| Property      | Description                                                                                                         | Type                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- |
| name          | The title of the incident.                                                                                          | string _(optional)_   |
| description   | The description of the incident.                                                                                    | string _(optional)_   |
| externalId    | The ID of the incident in IBM Resilient. If present, the incident is updated. Otherwise, a new incident is created. | string _(optional)_   |
| incidentTypes | An array with the IDs of IBM Resilient incident types.                                                              | number[] _(optional)_ |
| severityCode  | IBM Resilient ID of the severity code.                                                                              | number _(optional)_   |

#### `subActionParams (getFields)`

No parameters for the `getFields` subaction. Provide an empty object `{}`.

#### `subActionParams (incidentTypes)`

No parameters for the `incidentTypes` subaction. Provide an empty object `{}`.

#### `subActionParams (severity)`

No parameters for the `severity` subaction. Provide an empty object `{}`.

---
## Swimlane


### `params`

| Property        | Description                                          | Type   |
| --------------- | ---------------------------------------------------- | ------ |
| subAction       | The subaction to perform. It can be `pushToService`. | string |
| subActionParams | The parameters of the subaction.                     | object |


`subActionParams (pushToService)`

| Property | Description                                                                                                   | Type                  |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| incident | The Swimlane incident.                                                                                        | object                |
| comments | The comments of the case. A comment is of the form `{ commentId: string, version: string, comment: string }`. | object[] _(optional)_ |


The following table describes the properties of the `incident` object.

| Property    | Description                      | Type                |
| ----------- | -------------------------------- | ------------------- |
| alertId     | The alert id.                    | string _(optional)_ |
| caseId      | The case id of the incident.     | string _(optional)_ |
| caseName    | The case name of the incident.   | string _(optional)_ |
| description | The description of the incident. | string _(optional)_ |
| ruleName    | The rule name.                   | string _(optional)_ |
| severity    | The severity of the incident.    | string _(optional)_ |
---
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

# Developing New Action Types

When creating a new action type, your plugin will eventually call `server.plugins.actions.setup.registerType()` to register the type with the actions plugin, but there are some additional things to think about about and implement.

Consider working with the alerting team on early structure /design feedback of new actions, especially as the APIs and infrastructure are still under development.

Don't forget to ping @elastic/security-detections-response to see if the new connector should be enabled within their solution.

## licensing

Currently actions are licensed as "basic" if the action only interacts with the stack, eg the server log and es index actions. Other actions are at least "gold" level.

## plugin location

Currently actions that are licensed as "basic" **MUST** be implemented in the actions plugin, other actions can be implemented in any other plugin that pre-reqs the actions plugin. If the new action is generic across the stack, it probably belongs in the actions plugin, but if your action is very specific to a plugin/solution, it might be easiest to implement it in the plugin/solution. Keep in mind that if Kibana is run without the plugin being enabled, any actions defined in that plugin will not run, nor will those actions be available via APIs or UI.

Actions that take URLs or hostnames should check that those values are allowed. The allowed host list utilities are currently internal to the actions plugin, and so such actions will need to be implemented in the actions plugin. Longer-term, we will expose these utilities so they can be used by alerts implemented in other plugins; see [issue #64659](https://github.com/elastic/kibana/issues/64659).

## documentation

You should create asciidoc for the new action type. Add an entry to the action type index - [`docs/user/alerting/action-types.asciidoc`](../../../docs/user/alerting/action-types.asciidoc), which points to a new document for the action type that should be in the directory [`docs/user/alerting/action-types`](../../../docs/user/alerting/action-types).

We suggest following the template provided in `docs/action-type-template.asciidoc`. The [Email action type](https://www.elastic.co/guide/en/kibana/master/email-action-type.html) is an example of documentation created following the template.

## tests

The action type should have both jest tests and functional tests. For functional tests, if your action interacts with a 3rd party service via HTTP, you may be able to create a simulator for your service, to test with. See the existing functional test servers in the directory [`x-pack/test/alerting_api_integration/common/fixtures/plugins/actions_simulators/server`](../../test/alerting_api_integration/common/fixtures/plugins/actions_simulators/server)

## action type config and secrets

Action types must define `config` and `secrets` which are used to create connectors. This data should be described with `@kbn/config-schema` object schemas, and you **MUST NOT** use `schema.maybe()` to define properties.

This is due to the fact that the structures are persisted in saved objects, which performs partial updates on the persisted data. If a property value is already persisted, but an update either doesn't include the property, or sets it to `undefined`, the persisted value will not be changed. Beyond this being a semantic error in general, it also ends up invalidating the encryption used to save secrets, and will render the secrets will not be able to be unencrypted later.

Instead of `schema.maybe()`, use `schema.nullable()`, which is the same as `schema.maybe()` except that when passed an `undefined` value, the object returned from the validation will be set to `null`. The resulting type will be `property-type | null`, whereas with `schema.maybe()` it would be `property-type | undefined`.

## user interface

To make this action usable in the Kibana UI, you will need to provide all the UI editing aspects of the action. The existing action type user interfaces are defined in [`x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types`](../triggers_actions_ui/public/application/components/builtin_action_types). For more information, see the [UI documentation](../triggers_actions_ui/README.md#create-and-register-new-action-type-ui).
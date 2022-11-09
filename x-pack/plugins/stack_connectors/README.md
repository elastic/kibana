# Stack Connectors

The `stack_connectors` plugin provides connector types shipped with Kibana, built on top of the framework provided in the `actions` plugin.

---

Table of Contents

- [Connector Types](#connector-types)
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
- [Developing New Connector Types](#developing-new-connector-types)
  - [licensing](#licensing)
  - [plugin location](#plugin-location)
  - [documentation](#documentation)
  - [tests](#tests)
  - [connector type config and secrets](#connector-type-config-and-secrets)
  - [user interface](#user-interface)

# Connector Types

Kibana ships with a set of built-in connector types. See [Connectors Documentation](https://www.elastic.co/guide/en/kibana/master/action-types.html).

In addition to the documented configurations, several built in connector type offer additional `params` configurations.

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

Refer to the [Run connector API documentation](https://www.elastic.co/guide/en/kibana/master/execute-connector-api.html#execute-connector-api-request-body)
for the full list of properties.

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

## Ospgenie

Refer to the [Run connector API documentation](https://www.elastic.co/guide/en/kibana/master/execute-connector-api.html#execute-connector-api-request-body)
for the full list of properties.

### `params`

| Property        | Description                                                        | Type   |
| --------------- | ------------------------------------------------------------------ | ------ |
| subAction       | The subaction to perform. It can be `createAlert` or `closeAlert`. | string |
| subActionParams | The parameters of the subaction.                                   | object |

`subActionParams (createAlert)`

| Property | Description                                                                                                   | Type                  |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| message  | The alert message.                                                                                            | string                |

The optional parameters `alias`, `description`, `responders`, `visibleTo`, `actions`, `tags`, `details`, `entity`, `source`, `priority`, `user`, and `note` are supported. See the [Opsgenie API documentation](https://docs.opsgenie.com/docs/alert-api#create-alert) for more information on their types.

`subActionParams (closeAlert)`

No parameters are required. For the definition of the optional parameters see the [Opsgenie API documentation](https://docs.opsgenie.com/docs/alert-api#close-alert).

---

# Developing New Connector Types

When creating a new connector type, your plugin will eventually call `server.plugins.actions.setup.registerType()` to register the type with the `actions` plugin, but there are some additional things to think about about and implement.

Consider working with the alerting team on early structure /design feedback of new connectors, especially as the APIs and infrastructure are still under development.

Don't forget to ping @elastic/security-detections-response to see if the new connector should be enabled within their solution.

## Licensing

Currently connectors are licensed as "basic" if the connector only interacts with the stack, eg the server log and es index connectors. Other connectors are at least "gold" level.

## Plugin location

If the new connector is generic across the stack, it probably belongs in the `stack_connectors` plugin, but if your connector is very specific to a plugin/solution, it might be easiest to implement it in that plugin/solution.

Connectors that take URLs or hostnames should check that those values are allowed by using the allowed host utilities in the `actions` plugin.

## Documentation

You should create asciidoc for the new connector type. Add an entry to the connector type index - [`docs/user/alerting/action-types.asciidoc`](../../../docs/user/alerting/action-types.asciidoc), which points to a new document for the connector type that should be in the directory [`docs/user/alerting/action-types`](../../../docs/user/alerting/action-types).

We suggest following the template provided in `docs/action-type-template.asciidoc`. The [Email action type](https://www.elastic.co/guide/en/kibana/master/email-action-type.html) is an example of documentation created following the template.

## Tests

The connector type should have both unit tests and functional tests. For functional tests, if your connector interacts with a 3rd party service via HTTP, you may be able to create a simulator for your service to test with. See the existing functional test servers in the directory [`x-pack/test/alerting_api_integration/common/fixtures/plugins/actions_simulators/server`](../../test/alerting_api_integration/common/fixtures/plugins/actions_simulators/server)

## Connector type config and secrets

Connector types must define `config` and `secrets` which are used to create connectors. This data should be described with `@kbn/config-schema` object schemas, and you **MUST NOT** use `schema.maybe()` to define properties.

This is due to the fact that the structures are persisted in saved objects, which performs partial updates on the persisted data. If a property value is already persisted, but an update either doesn't include the property, or sets it to `undefined`, the persisted value will not be changed. Beyond this being a semantic error in general, it also ends up invalidating the encryption used to save secrets, and will render the secrets unable to be unencrypted later.

Instead of `schema.maybe()`, use `schema.nullable()`, which is the same as `schema.maybe()` except that when passed an `undefined` value, the object returned from the validation will be set to `null`. The resulting type will be `property-type | null`, whereas with `schema.maybe()` it would be `property-type | undefined`.

## User interface

To make this connector usable in the Kibana UI, you will need to provide all the UI editing aspects of the connector. The existing connector type user interfaces are defined in [`x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types`](../triggers_actions_ui/public/application/components/builtin_action_types). For more information, see the [UI documentation](../triggers_actions_ui/README.md#create-and-register-new-action-type-ui).

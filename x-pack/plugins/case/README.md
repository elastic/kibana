# Case Workflow

*Experimental Feature*

Elastic is developing a Case Management Workflow. Follow our progress:

- [Case API Documentation](https://documenter.getpostman.com/view/172706/SW7c2SuF?version=latest)
- [Github Meta](https://github.com/elastic/kibana/issues/50103)


# Action types


See [Kibana Actions](https://github.com/elastic/kibana/tree/master/x-pack/plugins/actions) for more information.

## Case 

ID: `.case`

The params properties are modelled after the arguments to the [Cases API](https://www.elastic.co/guide/en/security/master/cases-api-overview.html).

### `config`

This action has no `config` properties.

### `secrets`

This action type has no `secrets` properties.

### `params`

| Property        | Description                                                               | Type   |
| --------------- | ------------------------------------------------------------------------- | ------ |
| subAction       | The sub action to perform. It can be `create`, `update`, and `addComment` | string |
| subActionParams | The parameters of the sub action                                          | object |

#### `subActionParams (create)`

| Property    | Description                                                           | Type                    |
| ----------- | --------------------------------------------------------------------- | ----------------------- |
| tile        | The case’s title.                                                     | string                  |
| description | The case’s description.                                               | string                  |
| tags        | String array containing words and phrases that help categorize cases. | string[]                |
| connector   | Object containing the connector’s configuration.                      | [connector](#connector) |

#### `subActionParams (update)`

| Property    | Description                                                | Type                    |
| ----------- | ---------------------------------------------------------- | ----------------------- |
| id          | The ID of the case being updated.                          | string                  |
| tile        | The updated case title.                                    | string                  |
| description | The updated case description.                              | string                  |
| tags        | The updated case tags.                                     | string                  |
| connector   | Object containing the connector’s configuration.           | [connector](#connector) |
| status      | The updated case status, which can be: `open` or `closed`. | string                  |
| version     | The current case version.                                  | string                  |

#### `subActionParams (addComment)`

| Property | Description                                                                                                                                                            | Type   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| comment  | The case’s new comment.                                                                                                                                                | string |
| context  | Must be of: `{ type: "user" | "alert", savedObjectId: string | null}`. Comments of type `user` should have `savedObjectId: null`. All others, `savedObjectId: string`. | object |

#### `connector`

| Property | Description                                                                                       | Type              |
| -------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| id       | ID of the connector used for pushing case updates to external systems.                            | string            |
| name     | The connector name.                                                                               | string            |
| type     | The type of the connector. Must be one of these: `.servicenow`, `jira`, `.resilient`, and `.none` | string            |
| fields   | Object containing the connector’s fields.                                                         | [fields](#fields) |

#### `fields`

For ServiceNow connectors:

| Property | Description                   | Type   |
| -------- | ----------------------------- | ------ |
| urgency  | The urgency of the incident.  | string |
| severity | The severity of the incident. | string |
| impact   | The impact of the incident.   | string |

For Jira connectors:

| Property  | Description                                                          | Type   |
| --------- | -------------------------------------------------------------------- | ------ |
| issueType | The issue type of the issue.                                         | string |
| priority  | The priority of the issue.                                           | string |
| parent    | The key of the parent issue (Valid when the issue type is Sub-task). | string |

For IBM Resilient connectors:

| Property     | Description                     | Type     |
| ------------ | ------------------------------- | -------- |
| issueTypes   | The issue types of the issue.   | string[] |
| severityCode | The severity code of the issue. | string   |

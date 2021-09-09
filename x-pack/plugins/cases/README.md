Case management in Kibana

[![Issues][issues-shield]][issues-url]
[![Pull Requests][pr-shield]][pr-url] 

# Cases Plugin Docs

![Cases Logo][cases-logo] 

[Report Bug](https://github.com/elastic/kibana/issues/new?assignees=&labels=bug&template=Bug_report.md)
·
[Request Feature](https://github.com/elastic/kibana/issues/new?assignees=&labels=&template=Feature_request.md)

## Table of Contents

- [Cases API](#cases-api)
- [Cases Client API](#cases-client-api)
- [Cases UI](#cases-ui)
- [Case Action Type](#case-action-type) _feature in development, disabled by default_


## Cases API
[**Explore the API docs »**](https://www.elastic.co/guide/en/security/current/cases-api-overview.html)

## Cases Client API
[**Cases Client API docs**][cases-client-api-docs]

## Cases UI

#### Embed Cases UI components in any Kibana plugin
- Add `CasesUiStart` to Kibana plugin `StartServices` dependencies:

```ts
cases: CasesUiStart;
```

#### Cases UI Methods

- From the UI component, get the component from the `useKibana` hook start services
```tsx
  const { cases } = useKibana().services;
  // call in the return as you would any component
  cases.getCreateCase({
    onCancel: handleSetIsCancel,
    onSuccess,
    lensIntegration?: {
      plugins: {
        parsingPlugin,
        processingPluginRenderer,
        uiPlugin,
      },
      hooks: {
        useInsertTimeline,
      },
    }
    timelineIntegration?: {
      plugins: {
        parsingPlugin,
        processingPluginRenderer,
        uiPlugin,
      },
      hooks: {
        useInsertTimeline,
      },
    },
  })
```

##### Methods:
### `getAllCases`
Arguments:

| Property                 | Description                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| caseDetailsNavigation    | `CasesNavigation<CaseDetailsHrefSchema, 'configurable'>` route configuration to generate the case details url for the case details page |
| configureCasesNavigation | `CasesNavigation` route configuration for configure cases page                                                                          |
| createCaseNavigation     | `CasesNavigation` route configuration for create cases page                                                                             |
| userCanCrud              | `boolean;` user permissions to crud                                                                                                     |

UI component:
![All Cases Component][all-cases-img]

### `getAllCasesSelectorModal`
Arguments:

| Property             | Description                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| alertData?           | `Omit<CommentRequestAlertType, 'type'>;` alert data to post to case                               |
| createCaseNavigation | `CasesNavigation` route configuration for create cases page                                       |
| hiddenStatuses?      | `CaseStatuses[];` array of hidden statuses                                                        |
| onRowClick           | <code>(theCase?: Case &vert; SubCase) => void;</code> callback for row click, passing case in row |
| updateCase?          | <code>(theCase: Case &vert; SubCase) => void;</code> callback after case has been updated         |
| userCanCrud          | `boolean;` user permissions to crud                                                               |

UI component:
![All Cases Selector Modal Component][all-cases-modal-img]

### `getCaseView`
Arguments:

| Property                                                             | Description                                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| caseDetailsNavigation                                                | `CasesNavigation<CaseDetailsHrefSchema, 'configurable'>` route configuration to generate the case details url for the case details page |
| caseId                                                               | `string;` ID of the case                                                                                                                |
| configureCasesNavigation                                             | `CasesNavigation` route configuration for configure cases page                                                                          |
| createCaseNavigation                                                 | `CasesNavigation` route configuration for create cases page                                                                             |
| getCaseDetailHrefWithCommentId                                       | `(commentId: string) => string;` callback to generate the case details url with a comment id reference from the case id and comment id  |
| onComponentInitialized?                                              | `() => void;` callback when component has initialized                                                                                   |
| onCaseDataSuccess?                                                   | `(data: Case) => void;` optional callback to handle case data in consuming application                                                  |
| ruleDetailsNavigation                                                | <code>CasesNavigation<string &vert; null &vert; undefined, 'configurable'></code>                                                       |
| showAlertDetails                                                     | `(alertId: string, index: string) => void;` callback to show alert details                                                              |
| subCaseId?                                                           | `string;` subcase id                                                                                                                    |
| timelineIntegration?.editor_plugins                                  | Plugins needed for integrating timeline into markdown editor.                                                                           |
| timelineIntegration?.editor_plugins.parsingPlugin                    | `Plugin;`                                                                                                                               |
| timelineIntegration?.editor_plugins.processingPluginRenderer         | `React.FC<TimelineProcessingPluginRendererProps & { position: EuiMarkdownAstNodePosition }>`                                            |
| timelineIntegration?.editor_plugins.uiPlugin?                        | `EuiMarkdownEditorUiPlugin`                                                                                                             |
| timelineIntegration?.hooks.useInsertTimeline                         | `(value: string, onChange: (newValue: string) => void): UseInsertTimelineReturn`                                                        |
| timelineIntegration?.ui?.renderInvestigateInTimelineActionComponent? | `(alertIds: string[]) => JSX.Element;` space to render `InvestigateInTimelineActionComponent`                                           |
| timelineIntegration?.ui?renderTimelineDetailsPanel?                  | `() => JSX.Element;` space to render `TimelineDetailsPanel`                                                                             |
| useFetchAlertData                                                    | `(alertIds: string[]) => [boolean, Record<string, Ecs>];` fetch alerts                                                                  |
| userCanCrud                                                          | `boolean;` user permissions to crud                                                                                                     |

UI component:
 ![Case View Component][case-view-img] 

### `getCreateCase`
Arguments: 

| Property                                                     | Description                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| afterCaseCreated?                                            | `(theCase: Case) => Promise<void>;` callback passing newly created case before pushCaseToExternalService is called |
| onCancel                                                     | `() => void;` callback when create case is canceled                                                                |
| onSuccess                                                    | `(theCase: Case) => Promise<void>;` callback passing newly created case after pushCaseToExternalService is called  |
| timelineIntegration?.editor_plugins                          | Plugins needed for integrating timeline into markdown editor.                                                      |
| timelineIntegration?.editor_plugins.parsingPlugin            | `Plugin;`                                                                                                          |
| timelineIntegration?.editor_plugins.processingPluginRenderer | `React.FC<TimelineProcessingPluginRendererProps & { position: EuiMarkdownAstNodePosition }>`                       |
| timelineIntegration?.editor_plugins.uiPlugin?                | `EuiMarkdownEditorUiPlugin`                                                                                        |
| timelineIntegration?.hooks.useInsertTimeline                 | `(value: string, onChange: (newValue: string) => void): UseInsertTimelineReturn`                                   |

UI component:
 ![Create Component][create-img]
 
 ### `getConfigureCases`
 Arguments:
 
 | Property    | Description                          |
 | ----------- | ------------------------------------ |
 | userCanCrud | `boolean;`  user permissions to crud |
 
 UI component:
  ![Configure Component][configure-img] 

### `getRecentCases`
Arguments:

| Property              | Description                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| allCasesNavigation    | `CasesNavigation` route configuration for configure cases page                                                                          |
| caseDetailsNavigation | `CasesNavigation<CaseDetailsHrefSchema, 'configurable'>` route configuration to generate the case details url for the case details page |
| createCaseNavigation  | `CasesNavigation` route configuration for create case page                                                                              |
| maxCasesToShow        | `number;` number of cases to show in widget                                                                                             |
  
UI component:
 ![Recent Cases Component][recent-cases-img] 

## Case Action Type

_***Feature in development, disabled by default**_

See [Kibana Actions](https://github.com/elastic/kibana/tree/master/x-pack/plugins/actions) for more information.


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
| settings    | Object containing the case’s settings.                                | [settings](#settings)   |

#### `subActionParams (update)`

| Property    | Description                                                               | Type                    |
| ----------- | ------------------------------------------------------------------------- | ----------------------- |
| id          | The ID of the case being updated.                                         | string                  |
| tile        | The updated case title.                                                   | string                  |
| description | The updated case description.                                             | string                  |
| tags        | The updated case tags.                                                    | string                  |
| connector   | Object containing the connector’s configuration.                          | [connector](#connector) |
| status      | The updated case status, which can be: `open`, `in-progress` or `closed`. | string                  |
| settings    | Object containing the case’s settings.                                    | [settings](#settings)   |
| version     | The current case version.                                                 | string                  |

#### `subActionParams (addComment)`

| Property | Description              | Type   |
| -------- | ------------------------ | ------ |
| type     | The type of the comment. | `user` |
| comment  | The comment.             | string |

#### `connector`

| Property | Description                                                                                                                       | Type              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| id       | ID of the connector used for pushing case updates to external systems.                                                            | string            |
| name     | The connector name.                                                                                                               | string            |
| type     | The type of the connector. Must be one of these: `.servicenow`, `.servicenow-sir`, `.swimlane`, `jira`, `.resilient`, and `.none` | string            |
| fields   | Object containing the connector’s fields.                                                                                         | [fields](#fields) |

#### `fields`

For ServiceNow ITSM connectors (`.servicenow`):

| Property    | Description                    | Type   |
| ----------- | ------------------------------ | ------ |
| urgency     | The urgency of the incident.   | string |
| severity    | The severity of the incident.  | string |
| impact      | The impact of the incident.    | string |
| category    | The category in ServiceNow.    | string |
| subcategory | The subcategory in ServiceNow. | string |

For ServiceNow SecOps connectors (`.servicenow-sir`):

| Property    | Description                                                       | Type    |
| ----------- | ----------------------------------------------------------------- | ------- |
| category    | The category in ServiceNow.                                       | string  |
| destIp      | Include all destination IPs from all alerts attached to the case. | boolean |
| malwareHash | Include all malware hashes from all alerts attached to the case.  | boolean |
| malwareUrl  | Include all malware URLs from all alerts attached to the case.    | boolean |
| priority    | The priority of the incident.                                     | string  |
| sourceIp    | Include all sources IPs from all alerts attached to the case.     | boolean |
| subcategory | The subcategory in ServiceNow.                                    | string  |

For Jira connectors (`.jira`):

| Property  | Description                                                          | Type   |
| --------- | -------------------------------------------------------------------- | ------ |
| issueType | The issue type of the issue.                                         | string |
| priority  | The priority of the issue.                                           | string |
| parent    | The key of the parent issue (Valid when the issue type is Sub-task). | string |

For IBM Resilient connectors (`.resilient`):

| Property     | Description                     | Type     |
| ------------ | ------------------------------- | -------- |
| issueTypes   | The issue types of the issue.   | string[] |
| severityCode | The severity code of the issue. | string   |

For Swimlane (`.swimlane`):

| Property | Description         | Type   |
| -------- | ------------------- | ------ |
| caseId   | The ID of the case. | string |

Connectors of type (`.none`) should have the `fields` attribute set to `null`.

#### `settings`

| Property   | Description                    | Type    |
| ---------- | ------------------------------ | ------- |
| syncAlerts | Turn on or off alert synching. | boolean |






<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[pr-shield]: https://img.shields.io/github/issues-pr/elangosundar/awesome-README-templates?style=for-the-badge
[pr-url]: https://github.com/elastic/kibana/pulls?q=is%3Apr+label%3AFeature%3ACases+-is%3Adraft+is%3Aopen+
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/elastic/kibana/issues?q=is%3Aopen+is%3Aissue+label%3AFeature%3ACases
[cases-logo]: images/logo.png
[configure-img]: images/configure.png
[create-img]: images/create.png
[all-cases-img]: images/all_cases.png
[all-cases-modal-img]: images/all_cases_selector_modal.png
[recent-cases-img]: images/recent_cases.png
[case-view-img]: images/case_view.png
[cases-client-api-docs]: docs/cases_client/cases_client_api.md

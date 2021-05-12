[cases](../server_client_api.md) / [configure/client](../modules/configure_client.md) / ConfigureSubClient

# Interface: ConfigureSubClient

[configure/client](../modules/configure_client.md).ConfigureSubClient

This is the public API for interacting with the connector configuration for cases.

## Table of contents

### Methods

- [create](configure_client.configuresubclient.md#create)
- [get](configure_client.configuresubclient.md#get)
- [getConnectors](configure_client.configuresubclient.md#getconnectors)
- [update](configure_client.configuresubclient.md#update)

## Methods

### create

▸ **create**(`configuration`: { `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  }): *Promise*<{ `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  } & { `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  } & { `error`: ``null`` \| *string* ; `id`: *string* ; `owner`: *string* ; `version`: *string*  }\>

Creates a configuration if one does not already exist. If one exists it is deleted and a new one is created.

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | *object* |
| `configuration.closure_type` | ``"close-by-user"`` \| ``"close-by-pushing"`` |
| `configuration.connector` | { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } |
| `configuration.owner` | *string* |

**Returns:** *Promise*<{ `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  } & { `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  } & { `error`: ``null`` \| *string* ; `id`: *string* ; `owner`: *string* ; `version`: *string*  }\>

Defined in: [cases/server/client/configure/client.ts:97](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L97)

___

### get

▸ **get**(`params`: { `owner`: *undefined* \| *string* \| *string*[]  }): *Promise*<{} \| { `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  } & { `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  } & { `error`: ``null`` \| *string* ; `id`: *string* ; `owner`: *string* ; `version`: *string*  }\>

Retrieves the external connector configuration for a particular case owner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | *object* |
| `params.owner` | *undefined* \| *string* \| *string*[] |

**Returns:** *Promise*<{} \| { `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  } & { `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  } & { `error`: ``null`` \| *string* ; `id`: *string* ; `owner`: *string* ; `version`: *string*  }\>

Defined in: [cases/server/client/configure/client.ts:79](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L79)

___

### getConnectors

▸ **getConnectors**(): *Promise*<FindActionResult[]\>

Retrieves the valid external connectors supported by the cases plugin.

**Returns:** *Promise*<FindActionResult[]\>

Defined in: [cases/server/client/configure/client.ts:83](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L83)

___

### update

▸ **update**(`configurationId`: *string*, `configurations`: { `closure_type`: *undefined* \| ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: *undefined* \| { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  }  } & { `version`: *string*  }): *Promise*<{ `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  } & { `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  } & { `error`: ``null`` \| *string* ; `id`: *string* ; `owner`: *string* ; `version`: *string*  }\>

Updates a particular configuration with new values.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `configurationId` | *string* | the ID of the configuration to update |
| `configurations` | { `closure_type`: *undefined* \| ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: *undefined* \| { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  }  } & { `version`: *string*  } | the new configuration parameters |

**Returns:** *Promise*<{ `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` ; `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `owner`: *string*  } & { `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  } & { `error`: ``null`` \| *string* ; `id`: *string* ; `owner`: *string* ; `version`: *string*  }\>

Defined in: [cases/server/client/configure/client.ts:90](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L90)

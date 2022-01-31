[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AttachmentService

# Class: AttachmentService

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AttachmentService

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.AttachmentService.md#constructor)

### Methods

- [buildCountAlertsAggs](client.__internalNamespace.AttachmentService.md#buildcountalertsaggs)
- [bulkUpdate](client.__internalNamespace.AttachmentService.md#bulkupdate)
- [countAlertsAttachedToCase](client.__internalNamespace.AttachmentService.md#countalertsattachedtocase)
- [create](client.__internalNamespace.AttachmentService.md#create)
- [delete](client.__internalNamespace.AttachmentService.md#delete)
- [executeCaseActionsAggregations](client.__internalNamespace.AttachmentService.md#executecaseactionsaggregations)
- [get](client.__internalNamespace.AttachmentService.md#get)
- [getAllAlertsAttachToCase](client.__internalNamespace.AttachmentService.md#getallalertsattachtocase)
- [update](client.__internalNamespace.AttachmentService.md#update)

## Constructors

### constructor

• **new AttachmentService**(`log`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `log` | `Logger` |

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:66](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L66)

## Methods

### buildCountAlertsAggs

▸ `Private` **buildCountAlertsAggs**(): `Record`<`string`, `AggregationsAggregationContainer`\>

#### Returns

`Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:104](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L104)

___

### bulkUpdate

▸ **bulkUpdate**(`__namedParameters`): `Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`BulkUpdateAttachmentArgs`](../interfaces/client.__internalNamespace.BulkUpdateAttachmentArgs.md) |

#### Returns

`Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:262](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L262)

___

### countAlertsAttachedToCase

▸ **countAlertsAttachedToCase**(`__namedParameters`): `Promise`<`undefined` \| `number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`AttachedToCaseArgs`](../interfaces/client.__internalNamespace.AttachedToCaseArgs.md) |

#### Returns

`Promise`<`undefined` \| `number`\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:68](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L68)

___

### create

▸ **create**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateAttachmentArgs`](../interfaces/client.__internalNamespace.CreateAttachmentArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:220](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L220)

___

### delete

▸ **delete**(`__namedParameters`): `Promise`<{}\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetAttachmentArgs`](../interfaces/client.__internalNamespace.GetAttachmentArgs.md) |

#### Returns

`Promise`<{}\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:210](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L210)

___

### executeCaseActionsAggregations

▸ **executeCaseActionsAggregations**(`__namedParameters`): `Promise`<[`AggregationResponse`](../modules/client.__internalNamespace.md#aggregationresponse)\>

Executes the aggregations against the actions attached to a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CountActionsAttachedToCaseArgs`](../interfaces/client.__internalNamespace.CountActionsAttachedToCaseArgs.md) |

#### Returns

`Promise`<[`AggregationResponse`](../modules/client.__internalNamespace.md#aggregationresponse)\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:157](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L157)

___

### get

▸ **get**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetAttachmentArgs`](../interfaces/client.__internalNamespace.GetAttachmentArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:194](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L194)

___

### getAllAlertsAttachToCase

▸ **getAllAlertsAttachToCase**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>[]\>

Retrieves all the alerts attached to a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`AttachedToCaseArgs`](../interfaces/client.__internalNamespace.AttachedToCaseArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>[]\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:117](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L117)

___

### update

▸ **update**(`__namedParameters`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateAttachmentArgs`](../modules/client.__internalNamespace.md#updateattachmentargs) |

#### Returns

`Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:242](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L242)

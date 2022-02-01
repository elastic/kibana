[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / UpdateArgs

# Interface: UpdateArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).UpdateArgs

## Table of contents

### Properties

- [attachmentId](client._internal_namespace.UpdateArgs.md#attachmentid)
- [options](client._internal_namespace.UpdateArgs.md#options)
- [updatedAttributes](client._internal_namespace.UpdateArgs.md#updatedattributes)

## Properties

### attachmentId

• **attachmentId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:54](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L54)

___

### options

• `Optional` **options**: [`SavedObjectsUpdateOptions`](client._internal_namespace.SavedObjectsUpdateOptions.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:56](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L56)

___

### updatedAttributes

• **updatedAttributes**: { `created_at`: `undefined` \| `string` = rt.string; `created_by`: `undefined` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  } = UserRT; `owner`: `undefined` \| `string` = rt.string; `pushed_at`: `undefined` \| ``null`` \| `string` ; `pushed_by`: `undefined` \| ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  } ; `updated_at`: `undefined` \| ``null`` \| `string` ; `updated_by`: `undefined` \| ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }  } & { `alertId`: `undefined` \| `string` \| `string`[] ; `index`: `undefined` \| `string` \| `string`[] ; `owner`: `undefined` \| `string` = rt.string; `rule`: `undefined` \| { `id`: ``null`` \| `string` ; `name`: ``null`` \| `string`  } ; `type`: `undefined` \| [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `undefined` \| `string` = rt.string; `created_by`: `undefined` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  } = UserRT; `owner`: `undefined` \| `string` = rt.string; `pushed_at`: `undefined` \| ``null`` \| `string` ; `pushed_by`: `undefined` \| ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  } ; `updated_at`: `undefined` \| ``null`` \| `string` ; `updated_by`: `undefined` \| ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }  }

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:55](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L55)

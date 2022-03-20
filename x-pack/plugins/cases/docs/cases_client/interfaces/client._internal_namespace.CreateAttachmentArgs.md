[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CreateAttachmentArgs

# Interface: CreateAttachmentArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CreateAttachmentArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-1.md)

  ↳ **`CreateAttachmentArgs`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.CreateAttachmentArgs.md#attributes)
- [id](client._internal_namespace.CreateAttachmentArgs.md#id)
- [references](client._internal_namespace.CreateAttachmentArgs.md#references)
- [unsecuredSavedObjectsClient](client._internal_namespace.CreateAttachmentArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:48](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L48)

___

### id

• **id**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:50](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L50)

___

### references

• **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:49](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L49)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

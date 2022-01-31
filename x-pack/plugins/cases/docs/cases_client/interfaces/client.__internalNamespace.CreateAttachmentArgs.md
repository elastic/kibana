[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CreateAttachmentArgs

# Interface: CreateAttachmentArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CreateAttachmentArgs

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-1.md)

  ↳ **`CreateAttachmentArgs`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.CreateAttachmentArgs.md#attributes)
- [id](client.__internalNamespace.CreateAttachmentArgs.md#id)
- [references](client.__internalNamespace.CreateAttachmentArgs.md#references)
- [unsecuredSavedObjectsClient](client.__internalNamespace.CreateAttachmentArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:48](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L48)

___

### id

• **id**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:50](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L50)

___

### references

• **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:49](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L49)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

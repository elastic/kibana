[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / BulkCreateCaseDeletionUserAction

# Interface: BulkCreateCaseDeletionUserAction

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).BulkCreateCaseDeletionUserAction

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-1.md)

  ↳ **`BulkCreateCaseDeletionUserAction`**

## Table of contents

### Properties

- [cases](client.__internalNamespace.BulkCreateCaseDeletionUserAction.md#cases)
- [unsecuredSavedObjectsClient](client.__internalNamespace.BulkCreateCaseDeletionUserAction.md#unsecuredsavedobjectsclient)
- [user](client.__internalNamespace.BulkCreateCaseDeletionUserAction.md#user)

## Properties

### cases

• **cases**: { `connectorId`: `string` ; `id`: `string` ; `owner`: `string`  }[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:78](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L78)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

___

### user

• **user**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:79](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L79)

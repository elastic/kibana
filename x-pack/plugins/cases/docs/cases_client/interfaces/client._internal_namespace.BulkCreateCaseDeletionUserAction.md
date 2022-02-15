[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / BulkCreateCaseDeletionUserAction

# Interface: BulkCreateCaseDeletionUserAction

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).BulkCreateCaseDeletionUserAction

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-1.md)

  ↳ **`BulkCreateCaseDeletionUserAction`**

## Table of contents

### Properties

- [cases](client._internal_namespace.BulkCreateCaseDeletionUserAction.md#cases)
- [unsecuredSavedObjectsClient](client._internal_namespace.BulkCreateCaseDeletionUserAction.md#unsecuredsavedobjectsclient)
- [user](client._internal_namespace.BulkCreateCaseDeletionUserAction.md#user)

## Properties

### cases

• **cases**: { `connectorId`: `string` ; `id`: `string` ; `owner`: `string`  }[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:78](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L78)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

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

[x-pack/plugins/cases/server/services/user_actions/index.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L79)

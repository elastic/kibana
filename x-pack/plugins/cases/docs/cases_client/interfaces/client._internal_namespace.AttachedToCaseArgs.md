[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AttachedToCaseArgs

# Interface: AttachedToCaseArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AttachedToCaseArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-1.md)

  ↳ **`AttachedToCaseArgs`**

  ↳↳ [`CountActionsAttachedToCaseArgs`](client._internal_namespace.CountActionsAttachedToCaseArgs.md)

## Table of contents

### Properties

- [caseId](client._internal_namespace.AttachedToCaseArgs.md#caseid)
- [filter](client._internal_namespace.AttachedToCaseArgs.md#filter)
- [unsecuredSavedObjectsClient](client._internal_namespace.AttachedToCaseArgs.md#unsecuredsavedobjectsclient)

## Properties

### caseId

• **caseId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:33](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L33)

___

### filter

• `Optional` **filter**: `KueryNode`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:34](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L34)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

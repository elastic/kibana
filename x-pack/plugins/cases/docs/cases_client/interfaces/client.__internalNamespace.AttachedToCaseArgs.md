[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AttachedToCaseArgs

# Interface: AttachedToCaseArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AttachedToCaseArgs

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-1.md)

  ↳ **`AttachedToCaseArgs`**

  ↳↳ [`CountActionsAttachedToCaseArgs`](client.__internalNamespace.CountActionsAttachedToCaseArgs.md)

## Table of contents

### Properties

- [caseId](client.__internalNamespace.AttachedToCaseArgs.md#caseid)
- [filter](client.__internalNamespace.AttachedToCaseArgs.md#filter)
- [unsecuredSavedObjectsClient](client.__internalNamespace.AttachedToCaseArgs.md#unsecuredsavedobjectsclient)

## Properties

### caseId

• **caseId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:33](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L33)

___

### filter

• `Optional` **filter**: `KueryNode`

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:34](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L34)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

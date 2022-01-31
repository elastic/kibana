[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CountActionsAttachedToCaseArgs

# Interface: CountActionsAttachedToCaseArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CountActionsAttachedToCaseArgs

## Hierarchy

- [`AttachedToCaseArgs`](client.__internalNamespace.AttachedToCaseArgs.md)

  ↳ **`CountActionsAttachedToCaseArgs`**

## Table of contents

### Properties

- [aggregations](client.__internalNamespace.CountActionsAttachedToCaseArgs.md#aggregations)
- [caseId](client.__internalNamespace.CountActionsAttachedToCaseArgs.md#caseid)
- [filter](client.__internalNamespace.CountActionsAttachedToCaseArgs.md#filter)
- [unsecuredSavedObjectsClient](client.__internalNamespace.CountActionsAttachedToCaseArgs.md#unsecuredsavedobjectsclient)

## Properties

### aggregations

• **aggregations**: `Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:40](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L40)

___

### caseId

• **caseId**: `string`

#### Inherited from

[AttachedToCaseArgs](client.__internalNamespace.AttachedToCaseArgs.md).[caseId](client.__internalNamespace.AttachedToCaseArgs.md#caseid)

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:33](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L33)

___

### filter

• `Optional` **filter**: `KueryNode`

#### Inherited from

[AttachedToCaseArgs](client.__internalNamespace.AttachedToCaseArgs.md).[filter](client.__internalNamespace.AttachedToCaseArgs.md#filter)

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:34](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/attachments/index.ts#L34)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[AttachedToCaseArgs](client.__internalNamespace.AttachedToCaseArgs.md).[unsecuredSavedObjectsClient](client.__internalNamespace.AttachedToCaseArgs.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

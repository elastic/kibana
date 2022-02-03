[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CountActionsAttachedToCaseArgs

# Interface: CountActionsAttachedToCaseArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CountActionsAttachedToCaseArgs

## Hierarchy

- [`AttachedToCaseArgs`](client._internal_namespace.AttachedToCaseArgs.md)

  ↳ **`CountActionsAttachedToCaseArgs`**

## Table of contents

### Properties

- [aggregations](client._internal_namespace.CountActionsAttachedToCaseArgs.md#aggregations)
- [caseId](client._internal_namespace.CountActionsAttachedToCaseArgs.md#caseid)
- [filter](client._internal_namespace.CountActionsAttachedToCaseArgs.md#filter)
- [unsecuredSavedObjectsClient](client._internal_namespace.CountActionsAttachedToCaseArgs.md#unsecuredsavedobjectsclient)

## Properties

### aggregations

• **aggregations**: `Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:40](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L40)

___

### caseId

• **caseId**: `string`

#### Inherited from

[AttachedToCaseArgs](client._internal_namespace.AttachedToCaseArgs.md).[caseId](client._internal_namespace.AttachedToCaseArgs.md#caseid)

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:33](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L33)

___

### filter

• `Optional` **filter**: `KueryNode`

#### Inherited from

[AttachedToCaseArgs](client._internal_namespace.AttachedToCaseArgs.md).[filter](client._internal_namespace.AttachedToCaseArgs.md#filter)

#### Defined in

[x-pack/plugins/cases/server/services/attachments/index.ts:34](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/attachments/index.ts#L34)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[AttachedToCaseArgs](client._internal_namespace.AttachedToCaseArgs.md).[unsecuredSavedObjectsClient](client._internal_namespace.AttachedToCaseArgs.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

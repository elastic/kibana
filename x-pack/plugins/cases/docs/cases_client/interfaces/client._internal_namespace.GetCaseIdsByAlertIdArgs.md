[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / GetCaseIdsByAlertIdArgs

# Interface: GetCaseIdsByAlertIdArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).GetCaseIdsByAlertIdArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-1.md)

  ↳ **`GetCaseIdsByAlertIdArgs`**

## Table of contents

### Properties

- [alertId](client._internal_namespace.GetCaseIdsByAlertIdArgs.md#alertid)
- [filter](client._internal_namespace.GetCaseIdsByAlertIdArgs.md#filter)
- [unsecuredSavedObjectsClient](client._internal_namespace.GetCaseIdsByAlertIdArgs.md#unsecuredsavedobjectsclient)

## Properties

### alertId

• **alertId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:59](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L59)

___

### filter

• `Optional` **filter**: `KueryNode`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:60](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L60)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

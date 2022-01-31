[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / GetCaseIdsByAlertIdArgs

# Interface: GetCaseIdsByAlertIdArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).GetCaseIdsByAlertIdArgs

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-1.md)

  ↳ **`GetCaseIdsByAlertIdArgs`**

## Table of contents

### Properties

- [alertId](client.__internalNamespace.GetCaseIdsByAlertIdArgs.md#alertid)
- [filter](client.__internalNamespace.GetCaseIdsByAlertIdArgs.md#filter)
- [unsecuredSavedObjectsClient](client.__internalNamespace.GetCaseIdsByAlertIdArgs.md#unsecuredsavedobjectsclient)

## Properties

### alertId

• **alertId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:59](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/cases/index.ts#L59)

___

### filter

• `Optional` **filter**: `KueryNode`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:60](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/cases/index.ts#L60)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

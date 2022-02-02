[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CreateUserActionES

# Interface: CreateUserActionES<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CreateUserActionES

## Type parameters

| Name |
| :------ |
| `T` |

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-1.md)

  ↳ **`CreateUserActionES`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.CreateUserActionES.md#attributes)
- [references](client._internal_namespace.CreateUserActionES.md#references)
- [unsecuredSavedObjectsClient](client._internal_namespace.CreateUserActionES.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: `T`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:71](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L71)

___

### references

• **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:72](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L72)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

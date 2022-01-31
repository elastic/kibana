[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CreateUserActionES

# Interface: CreateUserActionES<T\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CreateUserActionES

## Type parameters

| Name |
| :------ |
| `T` |

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-1.md)

  ↳ **`CreateUserActionES`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.CreateUserActionES.md#attributes)
- [references](client.__internalNamespace.CreateUserActionES.md#references)
- [unsecuredSavedObjectsClient](client.__internalNamespace.CreateUserActionES.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: `T`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:71](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L71)

___

### references

• **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:72](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L72)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

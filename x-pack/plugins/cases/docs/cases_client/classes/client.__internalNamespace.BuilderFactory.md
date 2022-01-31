[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / BuilderFactory

# Class: BuilderFactory

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).BuilderFactory

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.BuilderFactory.md#constructor)

### Methods

- [getBuilder](client.__internalNamespace.BuilderFactory.md#getbuilder)

## Constructors

### constructor

• **new BuilderFactory**()

## Methods

### getBuilder

▸ **getBuilder**<`T`\>(`type`): `undefined` \| [`UserActionBuilder`](client.__internalNamespace.UserActionBuilder.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"status"`` \| ``"comment"`` \| ``"pushed"`` \| ``"create_case"`` \| ``"delete_case"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `T` |

#### Returns

`undefined` \| [`UserActionBuilder`](client.__internalNamespace.UserActionBuilder.md)

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/builder_factory.ts:35](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/builder_factory.ts#L35)

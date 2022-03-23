[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / BuilderFactory

# Class: BuilderFactory

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).BuilderFactory

## Table of contents

### Constructors

- [constructor](client._internal_namespace.BuilderFactory.md#constructor)

### Methods

- [getBuilder](client._internal_namespace.BuilderFactory.md#getbuilder)

## Constructors

### constructor

• **new BuilderFactory**()

## Methods

### getBuilder

▸ **getBuilder**<`T`\>(`type`): `undefined` \| [`UserActionBuilder`](client._internal_namespace.UserActionBuilder.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"status"`` \| ``"comment"`` \| ``"pushed"`` \| ``"create_case"`` \| ``"delete_case"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `T` |

#### Returns

`undefined` \| [`UserActionBuilder`](client._internal_namespace.UserActionBuilder.md)

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/builder_factory.ts:35](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/builder_factory.ts#L35)

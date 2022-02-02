[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RouteValidationResultFactory

# Interface: RouteValidationResultFactory

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RouteValidationResultFactory

Validation result factory to be used in the custom validation function to return the valid data or validation errors

See [RouteValidationFunction](../modules/client._internal_namespace.md#routevalidationfunction).

## Table of contents

### Methods

- [badRequest](client._internal_namespace.RouteValidationResultFactory.md#badrequest)
- [ok](client._internal_namespace.RouteValidationResultFactory.md#ok)

## Methods

### badRequest

▸ **badRequest**(`error`, `path?`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `string` \| `Error` |
| `path?` | `string`[] |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `error` | [`RouteValidationError`](../classes/client._internal_namespace.RouteValidationError.md) |

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:14

___

### ok

▸ **ok**<`T`\>(`value`): `Object`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `value` | `T` |

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:11

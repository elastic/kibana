[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / RouteValidationResultFactory

# Interface: RouteValidationResultFactory

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).RouteValidationResultFactory

Validation result factory to be used in the custom validation function to return the valid data or validation errors

See [RouteValidationFunction](../modules/client.__internalNamespace.md#routevalidationfunction).

## Table of contents

### Methods

- [badRequest](client.__internalNamespace.RouteValidationResultFactory.md#badrequest)
- [ok](client.__internalNamespace.RouteValidationResultFactory.md#ok)

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
| `error` | [`RouteValidationError`](../classes/client.__internalNamespace.RouteValidationError.md) |

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

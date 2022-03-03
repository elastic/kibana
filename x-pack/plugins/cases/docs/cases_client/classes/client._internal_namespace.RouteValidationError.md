[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RouteValidationError

# Class: RouteValidationError

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RouteValidationError

Error to return when the validation is not successful.

## Hierarchy

- `SchemaTypeError`

  ↳ **`RouteValidationError`**

## Table of contents

### Constructors

- [constructor](client._internal_namespace.RouteValidationError.md#constructor)

## Constructors

### constructor

• **new RouteValidationError**(`error`, `path?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `string` \| `Error` |
| `path?` | `string`[] |

#### Overrides

SchemaTypeError.constructor

#### Defined in

src/core/target/types/server/http/router/validator/validator_error.d.ts:7

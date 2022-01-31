[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / RouteValidationError

# Class: RouteValidationError

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).RouteValidationError

Error to return when the validation is not successful.

## Hierarchy

- `SchemaTypeError`

  ↳ **`RouteValidationError`**

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.RouteValidationError.md#constructor)

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

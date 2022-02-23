[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RouteValidatorOptions

# Interface: RouteValidatorOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RouteValidatorOptions

Additional options for the RouteValidator class to modify its default behaviour.

## Table of contents

### Properties

- [unsafe](client._internal_namespace.RouteValidatorOptions.md#unsafe)

## Properties

### unsafe

• `Optional` **unsafe**: `Object`

Set the `unsafe` config to avoid running some additional internal *safe* validations on top of your custom validation

#### Type declaration

| Name | Type |
| :------ | :------ |
| `body?` | `boolean` |
| `params?` | `boolean` |
| `query?` | `boolean` |

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:91

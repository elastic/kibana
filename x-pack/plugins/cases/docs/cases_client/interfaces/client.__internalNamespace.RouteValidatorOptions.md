[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / RouteValidatorOptions

# Interface: RouteValidatorOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).RouteValidatorOptions

Additional options for the RouteValidator class to modify its default behaviour.

## Table of contents

### Properties

- [unsafe](client.__internalNamespace.RouteValidatorOptions.md#unsafe)

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

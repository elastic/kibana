[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RouteValidatorConfig

# Interface: RouteValidatorConfig<P, Q, B\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RouteValidatorConfig

The configuration object to the RouteValidator class.
Set `params`, `query` and/or `body` to specify the validation logic to follow for that property.

## Type parameters

| Name |
| :------ |
| `P` |
| `Q` |
| `B` |

## Table of contents

### Properties

- [body](client._internal_namespace.RouteValidatorConfig.md#body)
- [params](client._internal_namespace.RouteValidatorConfig.md#params)
- [query](client._internal_namespace.RouteValidatorConfig.md#query)

## Properties

### body

• `Optional` **body**: [`RouteValidationSpec`](../modules/client._internal_namespace.md#routevalidationspec)<`B`\>

Validation logic for the body payload

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:79

___

### params

• `Optional` **params**: [`RouteValidationSpec`](../modules/client._internal_namespace.md#routevalidationspec)<`P`\>

Validation logic for the URL params

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:69

___

### query

• `Optional` **query**: [`RouteValidationSpec`](../modules/client._internal_namespace.md#routevalidationspec)<`Q`\>

Validation logic for the Query params

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:74

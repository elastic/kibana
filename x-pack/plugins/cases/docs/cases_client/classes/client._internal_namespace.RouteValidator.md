[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RouteValidator

# Class: RouteValidator<P, Q, B\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RouteValidator

Route validator class to define the validation logic for each new route.

**`internal`**

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | {} |
| `Q` | {} |
| `B` | {} |

## Table of contents

### Constructors

- [constructor](client._internal_namespace.RouteValidator.md#constructor)

### Properties

- [config](client._internal_namespace.RouteValidator.md#config)
- [customValidation](client._internal_namespace.RouteValidator.md#customvalidation)
- [options](client._internal_namespace.RouteValidator.md#options)
- [preValidateSchema](client._internal_namespace.RouteValidator.md#prevalidateschema)
- [safetyPostchecks](client._internal_namespace.RouteValidator.md#safetypostchecks)
- [safetyPrechecks](client._internal_namespace.RouteValidator.md#safetyprechecks)
- [validate](client._internal_namespace.RouteValidator.md#validate)
- [validateFunction](client._internal_namespace.RouteValidator.md#validatefunction)
- [ResultFactory](client._internal_namespace.RouteValidator.md#resultfactory)

### Methods

- [getBody](client._internal_namespace.RouteValidator.md#getbody)
- [getParams](client._internal_namespace.RouteValidator.md#getparams)
- [getQuery](client._internal_namespace.RouteValidator.md#getquery)
- [hasBody](client._internal_namespace.RouteValidator.md#hasbody)
- [from](client._internal_namespace.RouteValidator.md#from)

## Constructors

### constructor

• `Private` **new RouteValidator**<`P`, `Q`, `B`\>()

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | {} |
| `Q` | {} |
| `B` | {} |

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:112

## Properties

### config

• `Private` `Readonly` **config**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:108

___

### customValidation

• `Private` **customValidation**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:136

___

### options

• `Private` `Readonly` **options**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:109

___

### preValidateSchema

• `Private` **preValidateSchema**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:138

___

### safetyPostchecks

• `Private` **safetyPostchecks**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:135

___

### safetyPrechecks

• `Private` **safetyPrechecks**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:134

___

### validate

• `Private` **validate**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:133

___

### validateFunction

• `Private` **validateFunction**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:137

___

### ResultFactory

▪ `Static` `Private` **ResultFactory**: `any`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:111

## Methods

### getBody

▸ **getBody**(`data`, `namespace?`): `Readonly`<`B`\>

Get validated body

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `namespace?` | `string` |

#### Returns

`Readonly`<`B`\>

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:127

___

### getParams

▸ **getParams**(`data`, `namespace?`): `Readonly`<`P`\>

Get validated URL params

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `namespace?` | `string` |

#### Returns

`Readonly`<`P`\>

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:117

___

### getQuery

▸ **getQuery**(`data`, `namespace?`): `Readonly`<`Q`\>

Get validated query params

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `namespace?` | `string` |

#### Returns

`Readonly`<`Q`\>

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:122

___

### hasBody

▸ **hasBody**(): `boolean`

Has body validation

**`internal`**

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:132

___

### from

▸ `Static` **from**<`_P`, `_Q`, `_B`\>(`opts`): [`RouteValidator`](client._internal_namespace.RouteValidator.md)<`_P`, `_Q`, `_B`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `_P` | {} |
| `_Q` | {} |
| `_B` | {} |

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | [`RouteValidator`](client._internal_namespace.RouteValidator.md)<`_P`, `_Q`, `_B`\> \| [`RouteValidatorFullConfig`](../modules/client._internal_namespace.md#routevalidatorfullconfig)<`_P`, `_Q`, `_B`\> |

#### Returns

[`RouteValidator`](client._internal_namespace.RouteValidator.md)<`_P`, `_Q`, `_B`\>

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:110

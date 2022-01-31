[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / RouteValidator

# Class: RouteValidator<P, Q, B\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).RouteValidator

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

- [constructor](client.__internalNamespace.RouteValidator.md#constructor)

### Properties

- [config](client.__internalNamespace.RouteValidator.md#config)
- [customValidation](client.__internalNamespace.RouteValidator.md#customvalidation)
- [options](client.__internalNamespace.RouteValidator.md#options)
- [preValidateSchema](client.__internalNamespace.RouteValidator.md#prevalidateschema)
- [safetyPostchecks](client.__internalNamespace.RouteValidator.md#safetypostchecks)
- [safetyPrechecks](client.__internalNamespace.RouteValidator.md#safetyprechecks)
- [validate](client.__internalNamespace.RouteValidator.md#validate)
- [validateFunction](client.__internalNamespace.RouteValidator.md#validatefunction)
- [ResultFactory](client.__internalNamespace.RouteValidator.md#resultfactory)

### Methods

- [getBody](client.__internalNamespace.RouteValidator.md#getbody)
- [getParams](client.__internalNamespace.RouteValidator.md#getparams)
- [getQuery](client.__internalNamespace.RouteValidator.md#getquery)
- [hasBody](client.__internalNamespace.RouteValidator.md#hasbody)
- [from](client.__internalNamespace.RouteValidator.md#from)

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

▸ `Static` **from**<`_P`, `_Q`, `_B`\>(`opts`): [`RouteValidator`](client.__internalNamespace.RouteValidator.md)<`_P`, `_Q`, `_B`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `_P` | {} |
| `_Q` | {} |
| `_B` | {} |

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | [`RouteValidator`](client.__internalNamespace.RouteValidator.md)<`_P`, `_Q`, `_B`\> \| [`RouteValidatorFullConfig`](../modules/client.__internalNamespace.md#routevalidatorfullconfig)<`_P`, `_Q`, `_B`\> |

#### Returns

[`RouteValidator`](client.__internalNamespace.RouteValidator.md)<`_P`, `_Q`, `_B`\>

#### Defined in

src/core/target/types/server/http/router/validator/validator.d.ts:110

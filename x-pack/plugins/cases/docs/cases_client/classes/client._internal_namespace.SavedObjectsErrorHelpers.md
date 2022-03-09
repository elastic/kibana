[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsErrorHelpers

# Class: SavedObjectsErrorHelpers

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsErrorHelpers

## Table of contents

### Constructors

- [constructor](client._internal_namespace.SavedObjectsErrorHelpers.md#constructor)

### Methods

- [createBadRequestError](client._internal_namespace.SavedObjectsErrorHelpers.md#createbadrequesterror)
- [createConflictError](client._internal_namespace.SavedObjectsErrorHelpers.md#createconflicterror)
- [createGenericNotFoundError](client._internal_namespace.SavedObjectsErrorHelpers.md#creategenericnotfounderror)
- [createGenericNotFoundEsUnavailableError](client._internal_namespace.SavedObjectsErrorHelpers.md#creategenericnotfoundesunavailableerror)
- [createIndexAliasNotFoundError](client._internal_namespace.SavedObjectsErrorHelpers.md#createindexaliasnotfounderror)
- [createInvalidVersionError](client._internal_namespace.SavedObjectsErrorHelpers.md#createinvalidversionerror)
- [createTooManyRequestsError](client._internal_namespace.SavedObjectsErrorHelpers.md#createtoomanyrequestserror)
- [createUnsupportedTypeError](client._internal_namespace.SavedObjectsErrorHelpers.md#createunsupportedtypeerror)
- [decorateBadRequestError](client._internal_namespace.SavedObjectsErrorHelpers.md#decoratebadrequesterror)
- [decorateConflictError](client._internal_namespace.SavedObjectsErrorHelpers.md#decorateconflicterror)
- [decorateEsCannotExecuteScriptError](client._internal_namespace.SavedObjectsErrorHelpers.md#decorateescannotexecutescripterror)
- [decorateEsUnavailableError](client._internal_namespace.SavedObjectsErrorHelpers.md#decorateesunavailableerror)
- [decorateForbiddenError](client._internal_namespace.SavedObjectsErrorHelpers.md#decorateforbiddenerror)
- [decorateGeneralError](client._internal_namespace.SavedObjectsErrorHelpers.md#decorategeneralerror)
- [decorateIndexAliasNotFoundError](client._internal_namespace.SavedObjectsErrorHelpers.md#decorateindexaliasnotfounderror)
- [decorateNotAuthorizedError](client._internal_namespace.SavedObjectsErrorHelpers.md#decoratenotauthorizederror)
- [decorateRequestEntityTooLargeError](client._internal_namespace.SavedObjectsErrorHelpers.md#decoraterequestentitytoolargeerror)
- [decorateTooManyRequestsError](client._internal_namespace.SavedObjectsErrorHelpers.md#decoratetoomanyrequestserror)
- [isBadRequestError](client._internal_namespace.SavedObjectsErrorHelpers.md#isbadrequesterror)
- [isConflictError](client._internal_namespace.SavedObjectsErrorHelpers.md#isconflicterror)
- [isEsCannotExecuteScriptError](client._internal_namespace.SavedObjectsErrorHelpers.md#isescannotexecutescripterror)
- [isEsUnavailableError](client._internal_namespace.SavedObjectsErrorHelpers.md#isesunavailableerror)
- [isForbiddenError](client._internal_namespace.SavedObjectsErrorHelpers.md#isforbiddenerror)
- [isGeneralError](client._internal_namespace.SavedObjectsErrorHelpers.md#isgeneralerror)
- [isInvalidVersionError](client._internal_namespace.SavedObjectsErrorHelpers.md#isinvalidversionerror)
- [isNotAuthorizedError](client._internal_namespace.SavedObjectsErrorHelpers.md#isnotauthorizederror)
- [isNotFoundError](client._internal_namespace.SavedObjectsErrorHelpers.md#isnotfounderror)
- [isRequestEntityTooLargeError](client._internal_namespace.SavedObjectsErrorHelpers.md#isrequestentitytoolargeerror)
- [isSavedObjectsClientError](client._internal_namespace.SavedObjectsErrorHelpers.md#issavedobjectsclienterror)
- [isTooManyRequestsError](client._internal_namespace.SavedObjectsErrorHelpers.md#istoomanyrequestserror)

## Constructors

### constructor

• **new SavedObjectsErrorHelpers**()

## Methods

### createBadRequestError

▸ `Static` **createBadRequestError**(`reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:12

___

### createConflictError

▸ `Static` **createConflictError**(`type`, `id`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:28

___

### createGenericNotFoundError

▸ `Static` **createGenericNotFoundError**(`type?`, `id?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type?` | ``null`` \| `string` |
| `id?` | ``null`` \| `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:23

___

### createGenericNotFoundEsUnavailableError

▸ `Static` **createGenericNotFoundEsUnavailableError**(`type?`, `id?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type?` | ``null`` \| `string` |
| `id?` | ``null`` \| `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:39

___

### createIndexAliasNotFoundError

▸ `Static` **createIndexAliasNotFoundError**(`alias`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `alias` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:24

___

### createInvalidVersionError

▸ `Static` **createInvalidVersionError**(`versionInput?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionInput?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:15

___

### createTooManyRequestsError

▸ `Static` **createTooManyRequestsError**(`type`, `id`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:31

___

### createUnsupportedTypeError

▸ `Static` **createUnsupportedTypeError**(`type`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:13

___

### decorateBadRequestError

▸ `Static` **decorateBadRequestError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:11

___

### decorateConflictError

▸ `Static` **decorateConflictError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:27

___

### decorateEsCannotExecuteScriptError

▸ `Static` **decorateEsCannotExecuteScriptError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:33

___

### decorateEsUnavailableError

▸ `Static` **decorateEsUnavailableError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:35

___

### decorateForbiddenError

▸ `Static` **decorateForbiddenError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:19

___

### decorateGeneralError

▸ `Static` **decorateGeneralError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:37

___

### decorateIndexAliasNotFoundError

▸ `Static` **decorateIndexAliasNotFoundError**(`error`, `alias`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `alias` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:25

___

### decorateNotAuthorizedError

▸ `Static` **decorateNotAuthorizedError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:17

___

### decorateRequestEntityTooLargeError

▸ `Static` **decorateRequestEntityTooLargeError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:21

___

### decorateTooManyRequestsError

▸ `Static` **decorateTooManyRequestsError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:30

___

### isBadRequestError

▸ `Static` **isBadRequestError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:14

___

### isConflictError

▸ `Static` **isConflictError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:29

___

### isEsCannotExecuteScriptError

▸ `Static` **isEsCannotExecuteScriptError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:34

___

### isEsUnavailableError

▸ `Static` **isEsUnavailableError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:36

___

### isForbiddenError

▸ `Static` **isForbiddenError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:20

___

### isGeneralError

▸ `Static` **isGeneralError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:38

___

### isInvalidVersionError

▸ `Static` **isInvalidVersionError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:16

___

### isNotAuthorizedError

▸ `Static` **isNotAuthorizedError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:18

___

### isNotFoundError

▸ `Static` **isNotFoundError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:26

___

### isRequestEntityTooLargeError

▸ `Static` **isRequestEntityTooLargeError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:22

___

### isSavedObjectsClientError

▸ `Static` **isSavedObjectsClientError**(`error`): error is DecoratedError

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `any` |

#### Returns

error is DecoratedError

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:10

___

### isTooManyRequestsError

▸ `Static` **isTooManyRequestsError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client._internal_namespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:32

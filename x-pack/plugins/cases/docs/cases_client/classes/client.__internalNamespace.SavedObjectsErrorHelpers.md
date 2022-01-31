[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsErrorHelpers

# Class: SavedObjectsErrorHelpers

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsErrorHelpers

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.SavedObjectsErrorHelpers.md#constructor)

### Methods

- [createBadRequestError](client.__internalNamespace.SavedObjectsErrorHelpers.md#createbadrequesterror)
- [createConflictError](client.__internalNamespace.SavedObjectsErrorHelpers.md#createconflicterror)
- [createGenericNotFoundError](client.__internalNamespace.SavedObjectsErrorHelpers.md#creategenericnotfounderror)
- [createGenericNotFoundEsUnavailableError](client.__internalNamespace.SavedObjectsErrorHelpers.md#creategenericnotfoundesunavailableerror)
- [createIndexAliasNotFoundError](client.__internalNamespace.SavedObjectsErrorHelpers.md#createindexaliasnotfounderror)
- [createInvalidVersionError](client.__internalNamespace.SavedObjectsErrorHelpers.md#createinvalidversionerror)
- [createTooManyRequestsError](client.__internalNamespace.SavedObjectsErrorHelpers.md#createtoomanyrequestserror)
- [createUnsupportedTypeError](client.__internalNamespace.SavedObjectsErrorHelpers.md#createunsupportedtypeerror)
- [decorateBadRequestError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decoratebadrequesterror)
- [decorateConflictError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decorateconflicterror)
- [decorateEsCannotExecuteScriptError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decorateescannotexecutescripterror)
- [decorateEsUnavailableError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decorateesunavailableerror)
- [decorateForbiddenError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decorateforbiddenerror)
- [decorateGeneralError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decorategeneralerror)
- [decorateIndexAliasNotFoundError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decorateindexaliasnotfounderror)
- [decorateNotAuthorizedError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decoratenotauthorizederror)
- [decorateRequestEntityTooLargeError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decoraterequestentitytoolargeerror)
- [decorateTooManyRequestsError](client.__internalNamespace.SavedObjectsErrorHelpers.md#decoratetoomanyrequestserror)
- [isBadRequestError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isbadrequesterror)
- [isConflictError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isconflicterror)
- [isEsCannotExecuteScriptError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isescannotexecutescripterror)
- [isEsUnavailableError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isesunavailableerror)
- [isForbiddenError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isforbiddenerror)
- [isGeneralError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isgeneralerror)
- [isInvalidVersionError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isinvalidversionerror)
- [isNotAuthorizedError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isnotauthorizederror)
- [isNotFoundError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isnotfounderror)
- [isRequestEntityTooLargeError](client.__internalNamespace.SavedObjectsErrorHelpers.md#isrequestentitytoolargeerror)
- [isSavedObjectsClientError](client.__internalNamespace.SavedObjectsErrorHelpers.md#issavedobjectsclienterror)
- [isTooManyRequestsError](client.__internalNamespace.SavedObjectsErrorHelpers.md#istoomanyrequestserror)

## Constructors

### constructor

• **new SavedObjectsErrorHelpers**()

## Methods

### createBadRequestError

▸ `Static` **createBadRequestError**(`reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:12

___

### createConflictError

▸ `Static` **createConflictError**(`type`, `id`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:28

___

### createGenericNotFoundError

▸ `Static` **createGenericNotFoundError**(`type?`, `id?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type?` | ``null`` \| `string` |
| `id?` | ``null`` \| `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:23

___

### createGenericNotFoundEsUnavailableError

▸ `Static` **createGenericNotFoundEsUnavailableError**(`type?`, `id?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type?` | ``null`` \| `string` |
| `id?` | ``null`` \| `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:39

___

### createIndexAliasNotFoundError

▸ `Static` **createIndexAliasNotFoundError**(`alias`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `alias` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:24

___

### createInvalidVersionError

▸ `Static` **createInvalidVersionError**(`versionInput?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionInput?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:15

___

### createTooManyRequestsError

▸ `Static` **createTooManyRequestsError**(`type`, `id`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:31

___

### createUnsupportedTypeError

▸ `Static` **createUnsupportedTypeError**(`type`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:13

___

### decorateBadRequestError

▸ `Static` **decorateBadRequestError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:11

___

### decorateConflictError

▸ `Static` **decorateConflictError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:27

___

### decorateEsCannotExecuteScriptError

▸ `Static` **decorateEsCannotExecuteScriptError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:33

___

### decorateEsUnavailableError

▸ `Static` **decorateEsUnavailableError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:35

___

### decorateForbiddenError

▸ `Static` **decorateForbiddenError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:19

___

### decorateGeneralError

▸ `Static` **decorateGeneralError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:37

___

### decorateIndexAliasNotFoundError

▸ `Static` **decorateIndexAliasNotFoundError**(`error`, `alias`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `alias` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:25

___

### decorateNotAuthorizedError

▸ `Static` **decorateNotAuthorizedError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:17

___

### decorateRequestEntityTooLargeError

▸ `Static` **decorateRequestEntityTooLargeError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:21

___

### decorateTooManyRequestsError

▸ `Static` **decorateTooManyRequestsError**(`error`, `reason?`): [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `reason?` | `string` |

#### Returns

[`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:30

___

### isBadRequestError

▸ `Static` **isBadRequestError**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

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
| `error` | [`DecoratedError`](../interfaces/client.__internalNamespace.DecoratedError.md) \| `Error` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/errors.d.ts:32

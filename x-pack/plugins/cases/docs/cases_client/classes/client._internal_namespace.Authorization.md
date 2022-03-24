[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / Authorization

# Class: Authorization

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).Authorization

This class handles ensuring that the user making a request has the correct permissions
for the API request.

## Table of contents

### Constructors

- [constructor](client._internal_namespace.Authorization.md#constructor)

### Properties

- [auditLogger](client._internal_namespace.Authorization.md#auditlogger)
- [featureCaseOwners](client._internal_namespace.Authorization.md#featurecaseowners)
- [request](client._internal_namespace.Authorization.md#request)
- [securityAuth](client._internal_namespace.Authorization.md#securityauth)

### Methods

- [\_ensureAuthorized](client._internal_namespace.Authorization.md#_ensureauthorized)
- [\_getAuthorizationFilter](client._internal_namespace.Authorization.md#_getauthorizationfilter)
- [ensureAuthorized](client._internal_namespace.Authorization.md#ensureauthorized)
- [getAuthorizationFilter](client._internal_namespace.Authorization.md#getauthorizationfilter)
- [getAuthorizedOwners](client._internal_namespace.Authorization.md#getauthorizedowners)
- [shouldCheckAuthorization](client._internal_namespace.Authorization.md#shouldcheckauthorization)
- [create](client._internal_namespace.Authorization.md#create)

## Constructors

### constructor

• `Private` **new Authorization**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.auditLogger` | [`AuthorizationAuditLogger`](client._internal_namespace.AuthorizationAuditLogger.md) |
| `__namedParameters.caseOwners` | `Set`<`string`\> |
| `__namedParameters.request` | [`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |
| `__namedParameters.securityAuth?` | [`AuthorizationServiceSetup`](../interfaces/client._internal_namespace.AuthorizationServiceSetup.md) |

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:27](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L27)

## Properties

### auditLogger

• `Private` `Readonly` **auditLogger**: [`AuthorizationAuditLogger`](client._internal_namespace.AuthorizationAuditLogger.md)

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:25](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L25)

___

### featureCaseOwners

• `Private` `Readonly` **featureCaseOwners**: `Set`<`string`\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:24](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L24)

___

### request

• `Private` `Readonly` **request**: [`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:22](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L22)

___

### securityAuth

• `Private` `Readonly` **securityAuth**: `undefined` \| [`AuthorizationServiceSetup`](../interfaces/client._internal_namespace.AuthorizationServiceSetup.md)

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:23](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L23)

## Methods

### \_ensureAuthorized

▸ `Private` **_ensureAuthorized**(`owners`, `operation`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `owners` | `string`[] |
| `operation` | [`OperationDetails`](../interfaces/client._internal_namespace.OperationDetails.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:135](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L135)

___

### \_getAuthorizationFilter

▸ `Private` **_getAuthorizationFilter**(`operation`): `Promise`<[`AuthFilterHelpers`](../interfaces/client._internal_namespace.AuthFilterHelpers.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `operation` | [`OperationDetails`](../interfaces/client._internal_namespace.OperationDetails.md) |

#### Returns

`Promise`<[`AuthFilterHelpers`](../interfaces/client._internal_namespace.AuthFilterHelpers.md)\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:170](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L170)

___

### ensureAuthorized

▸ **ensureAuthorized**(`__namedParameters`): `Promise`<`void`\>

Checks that the user making the request for the passed in owners and operation has the correct authorization. This
function will throw if the user is not authorized for the requested operation and owners.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.entities` | [`OwnerEntity`](../interfaces/client._internal_namespace.OwnerEntity.md)[] |
| `__namedParameters.operation` | [`OperationDetails`](../interfaces/client._internal_namespace.OperationDetails.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:97](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L97)

___

### getAuthorizationFilter

▸ **getAuthorizationFilter**(`operation`): `Promise`<[`AuthFilterHelpers`](../interfaces/client._internal_namespace.AuthFilterHelpers.md)\>

Returns an object to filter the saved object find request to the authorized owners of an entity.

#### Parameters

| Name | Type |
| :------ | :------ |
| `operation` | [`OperationDetails`](../interfaces/client._internal_namespace.OperationDetails.md) |

#### Returns

`Promise`<[`AuthFilterHelpers`](../interfaces/client._internal_namespace.AuthFilterHelpers.md)\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:126](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L126)

___

### getAuthorizedOwners

▸ `Private` **getAuthorizedOwners**(`operations`): `Promise`<{ `authorizedOwners`: `string`[] ; `hasAllRequested`: `boolean` ; `username?`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `operations` | [`OperationDetails`](../interfaces/client._internal_namespace.OperationDetails.md)[] |

#### Returns

`Promise`<{ `authorizedOwners`: `string`[] ; `hasAllRequested`: `boolean` ; `username?`: `string`  }\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:207](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L207)

___

### shouldCheckAuthorization

▸ `Private` **shouldCheckAuthorization**(): `boolean`

#### Returns

`boolean`

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:85](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L85)

___

### create

▸ `Static` **create**(`__namedParameters`): `Promise`<[`Authorization`](client._internal_namespace.Authorization.md)\>

Creates an Authorization object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.auditLogger` | [`AuthorizationAuditLogger`](client._internal_namespace.AuthorizationAuditLogger.md) |
| `__namedParameters.features` | [`PluginStartContract`](../interfaces/client._internal_namespace.PluginStartContract.md) |
| `__namedParameters.getSpace` | [`GetSpaceFn`](../modules/client._internal_namespace.md#getspacefn) |
| `__namedParameters.logger` | `Logger` |
| `__namedParameters.request` | [`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |
| `__namedParameters.securityAuth?` | [`AuthorizationServiceSetup`](../interfaces/client._internal_namespace.AuthorizationServiceSetup.md) |

#### Returns

`Promise`<[`Authorization`](client._internal_namespace.Authorization.md)\>

#### Defined in

[x-pack/plugins/cases/server/authorization/authorization.ts:47](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/authorization.ts#L47)

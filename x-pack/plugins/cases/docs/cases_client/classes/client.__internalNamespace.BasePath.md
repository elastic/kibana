[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / BasePath

# Class: BasePath

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).BasePath

Access or manipulate the Kibana base path

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.BasePath.md#constructor)

### Properties

- [basePathCache](client.__internalNamespace.BasePath.md#basepathcache)
- [get](client.__internalNamespace.BasePath.md#get)
- [prepend](client.__internalNamespace.BasePath.md#prepend)
- [publicBaseUrl](client.__internalNamespace.BasePath.md#publicbaseurl)
- [remove](client.__internalNamespace.BasePath.md#remove)
- [serverBasePath](client.__internalNamespace.BasePath.md#serverbasepath)
- [set](client.__internalNamespace.BasePath.md#set)

## Constructors

### constructor

• **new BasePath**(`serverBasePath?`, `publicBaseUrl?`)

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `serverBasePath?` | `string` |
| `publicBaseUrl?` | `string` |

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:24

## Properties

### basePathCache

• `Private` `Readonly` **basePathCache**: `any`

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:8

___

### get

• **get**: (`request`: [`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>) => `string`

#### Type declaration

▸ (`request`): `string`

returns `basePath` value, specific for an incoming request.

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |

##### Returns

`string`

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:28

___

### prepend

• **prepend**: (`path`: `string`) => `string`

#### Type declaration

▸ (`path`): `string`

Prepends `path` with the basePath.

##### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

##### Returns

`string`

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:38

___

### publicBaseUrl

• `Optional` `Readonly` **publicBaseUrl**: `string`

The server's publicly exposed base URL, if configured. Includes protocol, host, port (optional) and the
[BasePath.serverBasePath](client.__internalNamespace.BasePath.md#serverbasepath).

**`remarks`**
Should be used for generating external URL links back to this Kibana instance.

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:22

___

### remove

• **remove**: (`path`: `string`) => `string`

#### Type declaration

▸ (`path`): `string`

Removes the prepended basePath from the `path`.

##### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

##### Returns

`string`

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:42

___

### serverBasePath

• `Readonly` **serverBasePath**: `string`

returns the server's basePath

See [BasePath.get](client.__internalNamespace.BasePath.md#get) for getting the basePath value for a specific request

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:14

___

### set

• **set**: (`request`: [`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>, `requestSpecificBasePath`: `string`) => `void`

#### Type declaration

▸ (`request`, `requestSpecificBasePath`): `void`

sets `basePath` value, specific for an incoming request.

**`privateremarks`** should work only for KibanaRequest as soon as spaces migrate to NP

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |
| `requestSpecificBasePath` | `string` |

##### Returns

`void`

#### Defined in

src/core/target/types/server/http/base_path_service.d.ts:34

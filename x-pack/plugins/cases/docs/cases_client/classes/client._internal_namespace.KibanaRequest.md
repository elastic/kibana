[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / KibanaRequest

# Class: KibanaRequest<Params, Query, Body, Method\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).KibanaRequest

Kibana specific abstraction for an incoming request.

## Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `unknown` |
| `Query` | `unknown` |
| `Body` | `unknown` |
| `Method` | extends [`RouteMethod`](../modules/client._internal_namespace.md#routemethod) = `any` |

## Table of contents

### Constructors

- [constructor](client._internal_namespace.KibanaRequest.md#constructor)

### Properties

- [[requestSymbol]](client._internal_namespace.KibanaRequest.md#[requestsymbol])
- [auth](client._internal_namespace.KibanaRequest.md#auth)
- [body](client._internal_namespace.KibanaRequest.md#body)
- [events](client._internal_namespace.KibanaRequest.md#events)
- [getAuthRequired](client._internal_namespace.KibanaRequest.md#getauthrequired)
- [getEvents](client._internal_namespace.KibanaRequest.md#getevents)
- [getRouteInfo](client._internal_namespace.KibanaRequest.md#getrouteinfo)
- [headers](client._internal_namespace.KibanaRequest.md#headers)
- [id](client._internal_namespace.KibanaRequest.md#id)
- [isSystemRequest](client._internal_namespace.KibanaRequest.md#issystemrequest)
- [params](client._internal_namespace.KibanaRequest.md#params)
- [query](client._internal_namespace.KibanaRequest.md#query)
- [rewrittenUrl](client._internal_namespace.KibanaRequest.md#rewrittenurl)
- [route](client._internal_namespace.KibanaRequest.md#route)
- [socket](client._internal_namespace.KibanaRequest.md#socket)
- [url](client._internal_namespace.KibanaRequest.md#url)
- [uuid](client._internal_namespace.KibanaRequest.md#uuid)
- [withoutSecretHeaders](client._internal_namespace.KibanaRequest.md#withoutsecretheaders)
- [validate](client._internal_namespace.KibanaRequest.md#validate)

### Methods

- [from](client._internal_namespace.KibanaRequest.md#from)

## Constructors

### constructor

• **new KibanaRequest**<`Params`, `Query`, `Body`, `Method`\>(`request`, `params`, `query`, `body`, `withoutSecretHeaders`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `unknown` |
| `Query` | `unknown` |
| `Body` | `unknown` |
| `Method` | extends [`RouteMethod`](../modules/client._internal_namespace.md#routemethod) = `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `Request` |
| `params` | `Params` |
| `query` | `Query` |
| `body` | `Body` |
| `withoutSecretHeaders` | `boolean` |

#### Defined in

src/core/target/types/server/http/router/request.d.ts:126

## Properties

### [requestSymbol]

• `Protected` `Readonly` **[requestSymbol]**: `Request`

**`internal`**

#### Defined in

src/core/target/types/server/http/router/request.d.ts:125

___

### auth

• `Readonly` **auth**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `isAuthenticated` | `boolean` |

#### Defined in

src/core/target/types/server/http/router/request.d.ts:117

___

### body

• `Readonly` **body**: `Body`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:66

___

### events

• `Readonly` **events**: [`KibanaRequestEvents`](../interfaces/client._internal_namespace.KibanaRequestEvents.md)

Request events [KibanaRequestEvents](../interfaces/client._internal_namespace.KibanaRequestEvents.md)

#### Defined in

src/core/target/types/server/http/router/request.d.ts:116

___

### getAuthRequired

• `Private` **getAuthRequired**: `any`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:129

___

### getEvents

• `Private` **getEvents**: `any`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:127

___

### getRouteInfo

• `Private` **getRouteInfo**: `any`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:128

___

### headers

• `Readonly` **headers**: [`Headers`](../modules/client._internal_namespace.md#headers)

Readonly copy of incoming request headers.

**`remarks`**
This property will contain a `filtered` copy of request headers.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:107

___

### id

• `Readonly` **id**: `string`

A identifier to identify this request.

**`remarks`**
Depending on the user's configuration, this value may be sourced from the
incoming request's `X-Opaque-Id` header which is not guaranteed to be unique
per request.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:89

___

### isSystemRequest

• `Readonly` **isSystemRequest**: `boolean`

Whether or not the request is a "system request" rather than an application-level request.
Can be set on the client using the `HttpFetchOptions#asSystemRequest` option.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:112

___

### params

• `Readonly` **params**: `Params`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:64

___

### query

• `Readonly` **query**: `Query`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:65

___

### rewrittenUrl

• `Optional` `Readonly` **rewrittenUrl**: `URL`

URL rewritten in onPreRouting request interceptor.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:123

___

### route

• `Readonly` **route**: `Readonly`<{ `method`: `RecursiveReadonly`<`Method`\> ; `options`: `RecursiveReadonly`<[`KibanaRequestRouteOptions`](../modules/client._internal_namespace.md#kibanarequestrouteoptions)<`Method`\>\> ; `path`: `string`  }\>

matched route details

#### Defined in

src/core/target/types/server/http/router/request.d.ts:101

___

### socket

• `Readonly` **socket**: [`IKibanaSocket`](../interfaces/client._internal_namespace.IKibanaSocket.md)

[IKibanaSocket](../interfaces/client._internal_namespace.IKibanaSocket.md)

#### Defined in

src/core/target/types/server/http/router/request.d.ts:114

___

### url

• `Readonly` **url**: `URL`

a WHATWG URL standard object.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:99

___

### uuid

• `Readonly` **uuid**: `string`

A UUID to identify this request.

**`remarks`**
This value is NOT sourced from the incoming request's `X-Opaque-Id` header. it
is always a UUID uniquely identifying the request.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:97

___

### withoutSecretHeaders

• `Private` `Readonly` **withoutSecretHeaders**: `any`

#### Defined in

src/core/target/types/server/http/router/request.d.ts:67

___

### validate

▪ `Static` `Private` **validate**: `any`

Validates the different parts of a request based on the schemas defined for
the route. Builds up the actual params, query and body object that will be
received in the route handler.

**`internal`**

#### Defined in

src/core/target/types/server/http/router/request.d.ts:80

## Methods

### from

▸ `Static` **from**<`P`, `Q`, `B`\>(`req`, `routeSchemas?`, `withoutSecretHeaders?`): [`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`P`, `Q`, `B`, `any`\>

Factory for creating requests. Validates the request before creating an
instance of a KibanaRequest.

**`internal`**

#### Type parameters

| Name |
| :------ |
| `P` |
| `Q` |
| `B` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `Request` |
| `routeSchemas?` | [`RouteValidator`](client._internal_namespace.RouteValidator.md)<`P`, `Q`, `B`\> \| [`RouteValidatorFullConfig`](../modules/client._internal_namespace.md#routevalidatorfullconfig)<`P`, `Q`, `B`\> |
| `withoutSecretHeaders?` | `boolean` |

#### Returns

[`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`P`, `Q`, `B`, `any`\>

#### Defined in

src/core/target/types/server/http/router/request.d.ts:73

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / KibanaRequest

# Class: KibanaRequest<Params, Query, Body, Method\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).KibanaRequest

Kibana specific abstraction for an incoming request.

## Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `unknown` |
| `Query` | `unknown` |
| `Body` | `unknown` |
| `Method` | extends [`RouteMethod`](../modules/client.__internalNamespace.md#routemethod) = `any` |

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.KibanaRequest.md#constructor)

### Properties

- [[requestSymbol]](client.__internalNamespace.KibanaRequest.md#[requestsymbol])
- [auth](client.__internalNamespace.KibanaRequest.md#auth)
- [body](client.__internalNamespace.KibanaRequest.md#body)
- [events](client.__internalNamespace.KibanaRequest.md#events)
- [getAuthRequired](client.__internalNamespace.KibanaRequest.md#getauthrequired)
- [getEvents](client.__internalNamespace.KibanaRequest.md#getevents)
- [getRouteInfo](client.__internalNamespace.KibanaRequest.md#getrouteinfo)
- [headers](client.__internalNamespace.KibanaRequest.md#headers)
- [id](client.__internalNamespace.KibanaRequest.md#id)
- [isSystemRequest](client.__internalNamespace.KibanaRequest.md#issystemrequest)
- [params](client.__internalNamespace.KibanaRequest.md#params)
- [query](client.__internalNamespace.KibanaRequest.md#query)
- [rewrittenUrl](client.__internalNamespace.KibanaRequest.md#rewrittenurl)
- [route](client.__internalNamespace.KibanaRequest.md#route)
- [socket](client.__internalNamespace.KibanaRequest.md#socket)
- [url](client.__internalNamespace.KibanaRequest.md#url)
- [uuid](client.__internalNamespace.KibanaRequest.md#uuid)
- [withoutSecretHeaders](client.__internalNamespace.KibanaRequest.md#withoutsecretheaders)
- [validate](client.__internalNamespace.KibanaRequest.md#validate)

### Methods

- [from](client.__internalNamespace.KibanaRequest.md#from)

## Constructors

### constructor

• **new KibanaRequest**<`Params`, `Query`, `Body`, `Method`\>(`request`, `params`, `query`, `body`, `withoutSecretHeaders`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `unknown` |
| `Query` | `unknown` |
| `Body` | `unknown` |
| `Method` | extends [`RouteMethod`](../modules/client.__internalNamespace.md#routemethod) = `any` |

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

• `Readonly` **events**: [`KibanaRequestEvents`](../interfaces/client.__internalNamespace.KibanaRequestEvents.md)

Request events [KibanaRequestEvents](../interfaces/client.__internalNamespace.KibanaRequestEvents.md)

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

• `Readonly` **headers**: [`Headers`](../modules/client.__internalNamespace.md#headers)

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

• `Readonly` **route**: `Readonly`<{ `method`: `RecursiveReadonly`<`Method`\> ; `options`: `RecursiveReadonly`<[`KibanaRequestRouteOptions`](../modules/client.__internalNamespace.md#kibanarequestrouteoptions)<`Method`\>\> ; `path`: `string`  }\>

matched route details

#### Defined in

src/core/target/types/server/http/router/request.d.ts:101

___

### socket

• `Readonly` **socket**: [`IKibanaSocket`](../interfaces/client.__internalNamespace.IKibanaSocket.md)

[IKibanaSocket](../interfaces/client.__internalNamespace.IKibanaSocket.md)

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

▸ `Static` **from**<`P`, `Q`, `B`\>(`req`, `routeSchemas?`, `withoutSecretHeaders?`): [`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`P`, `Q`, `B`, `any`\>

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
| `routeSchemas?` | [`RouteValidator`](client.__internalNamespace.RouteValidator.md)<`P`, `Q`, `B`\> \| [`RouteValidatorFullConfig`](../modules/client.__internalNamespace.md#routevalidatorfullconfig)<`P`, `Q`, `B`\> |
| `withoutSecretHeaders?` | `boolean` |

#### Returns

[`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`P`, `Q`, `B`, `any`\>

#### Defined in

src/core/target/types/server/http/router/request.d.ts:73

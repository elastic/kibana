[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / RouteConfigOptions

# Interface: RouteConfigOptions<Method\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).RouteConfigOptions

Additional route options.

## Type parameters

| Name | Type |
| :------ | :------ |
| `Method` | extends [`RouteMethod`](../modules/client.__internalNamespace.md#routemethod) |

## Table of contents

### Properties

- [authRequired](client.__internalNamespace.RouteConfigOptions.md#authrequired)
- [body](client.__internalNamespace.RouteConfigOptions.md#body)
- [tags](client.__internalNamespace.RouteConfigOptions.md#tags)
- [timeout](client.__internalNamespace.RouteConfigOptions.md#timeout)
- [xsrfRequired](client.__internalNamespace.RouteConfigOptions.md#xsrfrequired)

## Properties

### authRequired

• `Optional` **authRequired**: `boolean` \| ``"optional"``

Defines authentication mode for a route:
- true. A user has to have valid credentials to access a resource
- false. A user can access a resource without any credentials.
- 'optional'. A user can access a resource, and will be authenticated if provided credentials are valid.
              Can be useful when we grant access to a resource but want to identify a user if possible.

Defaults to `true` if an auth mechanism is registered.

#### Defined in

src/core/target/types/server/http/router/route.d.ts:89

___

### body

• `Optional` **body**: `Method` extends ``"options"`` \| ``"get"`` ? `undefined` : [`RouteConfigOptionsBody`](client.__internalNamespace.RouteConfigOptionsBody.md)

Additional body options [RouteConfigOptionsBody](client.__internalNamespace.RouteConfigOptionsBody.md).

#### Defined in

src/core/target/types/server/http/router/route.d.ts:105

___

### tags

• `Optional` **tags**: readonly `string`[]

Additional metadata tag strings to attach to the route.

#### Defined in

src/core/target/types/server/http/router/route.d.ts:101

___

### timeout

• `Optional` **timeout**: `Object`

Defines per-route timeouts.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `idleSocket?` | `number` | Milliseconds the socket can be idle before it's closed |
| `payload?` | `Method` extends ``"options"`` \| ``"get"`` ? `undefined` : `number` | Milliseconds to receive the payload |

#### Defined in

src/core/target/types/server/http/router/route.d.ts:109

___

### xsrfRequired

• `Optional` **xsrfRequired**: `Method` extends ``"get"`` ? `never` : `boolean`

Defines xsrf protection requirements for a route:
- true. Requires an incoming POST/PUT/DELETE request to contain `kbn-xsrf` header.
- false. Disables xsrf protection.

Set to true by default

#### Defined in

src/core/target/types/server/http/router/route.d.ts:97

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RouteConfigOptions

# Interface: RouteConfigOptions<Method\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RouteConfigOptions

Additional route options.

## Type parameters

| Name | Type |
| :------ | :------ |
| `Method` | extends [`RouteMethod`](../modules/client._internal_namespace.md#routemethod) |

## Table of contents

### Properties

- [authRequired](client._internal_namespace.RouteConfigOptions.md#authrequired)
- [body](client._internal_namespace.RouteConfigOptions.md#body)
- [tags](client._internal_namespace.RouteConfigOptions.md#tags)
- [timeout](client._internal_namespace.RouteConfigOptions.md#timeout)
- [xsrfRequired](client._internal_namespace.RouteConfigOptions.md#xsrfrequired)

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

• `Optional` **body**: `Method` extends ``"options"`` \| ``"get"`` ? `undefined` : [`RouteConfigOptionsBody`](client._internal_namespace.RouteConfigOptionsBody.md)

Additional body options [RouteConfigOptionsBody](client._internal_namespace.RouteConfigOptionsBody.md).

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

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / Actions

# Class: Actions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).Actions

Actions are used to create the "actions" that are associated with Elasticsearch's
application privileges, and are used to perform the authorization checks implemented
by the various `checkPrivilegesWithRequest` derivatives.

## Table of contents

### Constructors

- [constructor](client._internal_namespace.Actions.md#constructor)

### Properties

- [alerting](client._internal_namespace.Actions.md#alerting)
- [api](client._internal_namespace.Actions.md#api)
- [app](client._internal_namespace.Actions.md#app)
- [cases](client._internal_namespace.Actions.md#cases)
- [login](client._internal_namespace.Actions.md#login)
- [savedObject](client._internal_namespace.Actions.md#savedobject)
- [space](client._internal_namespace.Actions.md#space)
- [ui](client._internal_namespace.Actions.md#ui)
- [version](client._internal_namespace.Actions.md#version)
- [versionNumber](client._internal_namespace.Actions.md#versionnumber)

## Constructors

### constructor

• **new Actions**(`versionNumber`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionNumber` | `string` |

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:23

## Properties

### alerting

• `Readonly` **alerting**: [`AlertingActions`](client._internal_namespace.AlertingActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:19

___

### api

• `Readonly` **api**: [`ApiActions`](client._internal_namespace.ApiActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:14

___

### app

• `Readonly` **app**: [`AppActions`](client._internal_namespace.AppActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:15

___

### cases

• `Readonly` **cases**: [`CasesActions`](client._internal_namespace.CasesActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:16

___

### login

• `Readonly` **login**: `string`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:17

___

### savedObject

• `Readonly` **savedObject**: [`SavedObjectActions`](client._internal_namespace.SavedObjectActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:18

___

### space

• `Readonly` **space**: [`SpaceActions`](client._internal_namespace.SpaceActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:20

___

### ui

• `Readonly` **ui**: [`UIActions`](client._internal_namespace.UIActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:21

___

### version

• `Readonly` **version**: `string`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:22

___

### versionNumber

• `Private` `Readonly` **versionNumber**: `any`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:13

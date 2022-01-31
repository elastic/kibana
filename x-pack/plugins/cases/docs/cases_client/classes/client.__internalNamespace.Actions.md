[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / Actions

# Class: Actions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).Actions

Actions are used to create the "actions" that are associated with Elasticsearch's
application privileges, and are used to perform the authorization checks implemented
by the various `checkPrivilegesWithRequest` derivatives.

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.Actions.md#constructor)

### Properties

- [alerting](client.__internalNamespace.Actions.md#alerting)
- [api](client.__internalNamespace.Actions.md#api)
- [app](client.__internalNamespace.Actions.md#app)
- [cases](client.__internalNamespace.Actions.md#cases)
- [login](client.__internalNamespace.Actions.md#login)
- [savedObject](client.__internalNamespace.Actions.md#savedobject)
- [space](client.__internalNamespace.Actions.md#space)
- [ui](client.__internalNamespace.Actions.md#ui)
- [version](client.__internalNamespace.Actions.md#version)
- [versionNumber](client.__internalNamespace.Actions.md#versionnumber)

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

• `Readonly` **alerting**: [`AlertingActions`](client.__internalNamespace.AlertingActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:19

___

### api

• `Readonly` **api**: [`ApiActions`](client.__internalNamespace.ApiActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:14

___

### app

• `Readonly` **app**: [`AppActions`](client.__internalNamespace.AppActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:15

___

### cases

• `Readonly` **cases**: [`CasesActions`](client.__internalNamespace.CasesActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:16

___

### login

• `Readonly` **login**: `string`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:17

___

### savedObject

• `Readonly` **savedObject**: [`SavedObjectActions`](client.__internalNamespace.SavedObjectActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:18

___

### space

• `Readonly` **space**: [`SpaceActions`](client.__internalNamespace.SpaceActions.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/actions.d.ts:20

___

### ui

• `Readonly` **ui**: [`UIActions`](client.__internalNamespace.UIActions.md)

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

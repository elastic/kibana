[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / OperationDetails

# Interface: OperationDetails

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).OperationDetails

Defines the structure for a case API route.

## Table of contents

### Properties

- [action](client._internal_namespace.OperationDetails.md#action)
- [docType](client._internal_namespace.OperationDetails.md#doctype)
- [ecsType](client._internal_namespace.OperationDetails.md#ecstype)
- [name](client._internal_namespace.OperationDetails.md#name)
- [savedObjectType](client._internal_namespace.OperationDetails.md#savedobjecttype)
- [verbs](client._internal_namespace.OperationDetails.md#verbs)

## Properties

### action

• **action**: `string`

The ECS `event.action` field, should be in the form of <entity>_<operation> e.g comment_get, case_fined

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:83](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L83)

___

### docType

• **docType**: `string`

The readable name of the entity being operated on e.g. case, comment, configurations (make it plural if it reads better that way etc)

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:91](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L91)

___

### ecsType

• **ecsType**: `EcsEventType`

The ECS event type that this operation should be audit logged as (creation, deletion, access, etc)

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:74](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L74)

___

### name

• **name**: `string`

The name of the operation to authorize against for the privilege check.
These values need to match one of the operation strings defined here: x-pack/plugins/security/server/authorization/privileges/feature_privilege_builder/cases.ts

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L79)

___

### savedObjectType

• **savedObjectType**: `string`

The actual saved object type of the entity e.g. cases, cases-comments

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:95](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L95)

___

### verbs

• **verbs**: [`Verbs`](client._internal_namespace.Verbs.md)

The verbs that are associated with this type of operation, these should line up with the event type e.g. creating, created, create etc

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:87](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L87)

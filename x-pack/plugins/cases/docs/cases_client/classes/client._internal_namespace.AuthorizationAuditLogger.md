[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AuthorizationAuditLogger

# Class: AuthorizationAuditLogger

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AuthorizationAuditLogger

Audit logger for authorization operations

## Table of contents

### Constructors

- [constructor](client._internal_namespace.AuthorizationAuditLogger.md#constructor)

### Properties

- [auditLogger](client._internal_namespace.AuthorizationAuditLogger.md#auditlogger)

### Methods

- [log](client._internal_namespace.AuthorizationAuditLogger.md#log)
- [createAuditMsg](client._internal_namespace.AuthorizationAuditLogger.md#createauditmsg)
- [createFailureMessage](client._internal_namespace.AuthorizationAuditLogger.md#createfailuremessage)

## Constructors

### constructor

• **new AuthorizationAuditLogger**(`logger?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger?` | [`AuditLogger`](../interfaces/client._internal_namespace.AuditLogger.md) |

#### Defined in

[x-pack/plugins/cases/server/authorization/audit_logger.ts:25](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/audit_logger.ts#L25)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: [`AuditLogger`](../interfaces/client._internal_namespace.AuditLogger.md)

#### Defined in

[x-pack/plugins/cases/server/authorization/audit_logger.ts:23](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/audit_logger.ts#L23)

## Methods

### log

▸ **log**(`auditMsgParams`): `void`

Logs an audit event based on the status of an operation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `auditMsgParams` | [`CreateAuditMsgParams`](../interfaces/client._internal_namespace.CreateAuditMsgParams.md) |

#### Returns

`void`

#### Defined in

[x-pack/plugins/cases/server/authorization/audit_logger.ts:98](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/audit_logger.ts#L98)

___

### createAuditMsg

▸ `Static` `Private` **createAuditMsg**(`__namedParameters`): [`AuditEvent`](../interfaces/client._internal_namespace.AuditEvent.md)

Creates an AuditEvent describing the state of a request.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateAuditMsgParams`](../interfaces/client._internal_namespace.CreateAuditMsgParams.md) |

#### Returns

[`AuditEvent`](../interfaces/client._internal_namespace.AuditEvent.md)

#### Defined in

[x-pack/plugins/cases/server/authorization/audit_logger.ts:32](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/audit_logger.ts#L32)

___

### createFailureMessage

▸ `Static` **createFailureMessage**(`__namedParameters`): `string`

Creates a message to be passed to an Error or Boom.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.operation` | [`OperationDetails`](../interfaces/client._internal_namespace.OperationDetails.md) |
| `__namedParameters.owners` | `string`[] |

#### Returns

`string`

#### Defined in

[x-pack/plugins/cases/server/authorization/audit_logger.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/audit_logger.ts#L79)

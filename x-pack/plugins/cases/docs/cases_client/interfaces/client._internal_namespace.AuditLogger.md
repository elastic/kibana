[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AuditLogger

# Interface: AuditLogger

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AuditLogger

## Table of contents

### Methods

- [log](client._internal_namespace.AuditLogger.md#log)

## Methods

### log

▸ **log**(`event`): `void`

Logs an [AuditEvent](client._internal_namespace.AuditEvent.md) and automatically adds meta data about the
current user, space and correlation id.

Guidelines around what events should be logged and how they should be
structured can be found in: `/x-pack/plugins/security/README.md`

**`example`**
```typescript
const auditLogger = securitySetup.audit.asScoped(request);
auditLogger.log({
  message: 'User is updating dashboard [id=123]',
  event: {
    action: 'saved_object_update',
    outcome: 'unknown'
  },
  kibana: {
    saved_object: { type: 'dashboard', id: '123' }
  },
});
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `undefined` \| [`AuditEvent`](client._internal_namespace.AuditEvent.md) |

#### Returns

`void`

#### Defined in

x-pack/plugins/security/target/types/server/audit/audit_service.d.ts:32

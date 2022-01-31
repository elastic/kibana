[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AuditLogger

# Interface: AuditLogger

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AuditLogger

## Table of contents

### Methods

- [log](client.__internalNamespace.AuditLogger.md#log)

## Methods

### log

▸ **log**(`event`): `void`

Logs an [AuditEvent](client.__internalNamespace.AuditEvent.md) and automatically adds meta data about the
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
| `event` | `undefined` \| [`AuditEvent`](client.__internalNamespace.AuditEvent.md) |

#### Returns

`void`

#### Defined in

x-pack/plugins/security/target/types/server/audit/audit_service.d.ts:32

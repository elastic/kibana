[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AuditEvent

# Interface: AuditEvent

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AuditEvent

Audit event schema using ECS format: https://www.elastic.co/guide/en/ecs/1.12/index.html

If you add additional fields to the schema ensure you update the Kibana Filebeat module:
https://github.com/elastic/beats/tree/master/filebeat/module/kibana

## Hierarchy

- `LogMeta`

  ↳ **`AuditEvent`**

## Table of contents

### Properties

- [kibana](client._internal_namespace.AuditEvent.md#kibana)
- [message](client._internal_namespace.AuditEvent.md#message)

## Properties

### kibana

• `Optional` **kibana**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `add_to_spaces?` | readonly `string`[] | Set of space IDs that a saved object was shared to. |
| `authentication_provider?` | `string` | Name of authentication provider associated with a login event. |
| `authentication_realm?` | `string` | Name of Elasticsearch realm that has authenticated the user. |
| `authentication_type?` | `string` | Type of authentication provider associated with a login event. |
| `delete_from_spaces?` | readonly `string`[] | Set of space IDs that a saved object was removed from. |
| `lookup_realm?` | `string` | Name of Elasticsearch realm where the user details were retrieved from. |
| `saved_object?` | `Object` | Saved object that was created, changed, deleted or accessed as part of this event. |
| `saved_object.id` | `string` | - |
| `saved_object.type` | `string` | - |
| `session_id?` | `string` | The ID of the user session associated with this event. Each login attempt results in a unique session id. |
| `space_id?` | `string` | The ID of the space associated with this event. |

#### Defined in

x-pack/plugins/security/target/types/server/audit/audit_events.d.ts:14

___

### message

• **message**: `string`

#### Defined in

x-pack/plugins/security/target/types/server/audit/audit_events.d.ts:13

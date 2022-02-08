[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / Attributes

# Interface: Attributes

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).Attributes

## Table of contents

### Properties

- [action](client._internal_namespace.Attributes.md#action)
- [created\_at](client._internal_namespace.Attributes.md#created_at)
- [created\_by](client._internal_namespace.Attributes.md#created_by)
- [owner](client._internal_namespace.Attributes.md#owner)
- [payload](client._internal_namespace.Attributes.md#payload)
- [type](client._internal_namespace.Attributes.md#type)

## Properties

### action

• **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:84](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L84)

___

### created\_at

• **created\_at**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:85](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L85)

___

### created\_by

• **created\_by**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:86](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L86)

___

### owner

• **owner**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:87](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L87)

___

### payload

• **payload**: `Record`<`string`, `unknown`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:89](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L89)

___

### type

• **type**: ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"status"`` \| ``"comment"`` \| ``"pushed"`` \| ``"create_case"`` \| ``"delete_case"``

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:88](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L88)

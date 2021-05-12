[cases](../server_client_api.md) / [cases/types](../modules/cases_types.md) / PrepareFieldsForTransformArgs

# Interface: PrepareFieldsForTransformArgs

[cases/types](../modules/cases_types.md).PrepareFieldsForTransformArgs

## Table of contents

### Properties

- [defaultPipes](cases_types.preparefieldsfortransformargs.md#defaultpipes)
- [mappings](cases_types.preparefieldsfortransformargs.md#mappings)
- [params](cases_types.preparefieldsfortransformargs.md#params)

## Properties

### defaultPipes

• **defaultPipes**: *string*[]

Defined in: [cases/server/client/cases/types.ts:49](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L49)

___

### mappings

• **mappings**: { `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]

Defined in: [cases/server/client/cases/types.ts:50](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L50)

___

### params

• **params**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description` | *string* |
| `title` | *string* |

Defined in: [cases/server/client/cases/types.ts:51](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L51)

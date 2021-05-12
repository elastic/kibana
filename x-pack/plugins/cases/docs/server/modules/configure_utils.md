[cases](../server_client_api.md) / configure/utils

# Module: configure/utils

## Table of contents

### Functions

- [createDefaultMapping](configure_utils.md#createdefaultmapping)
- [formatFields](configure_utils.md#formatfields)

## Functions

### createDefaultMapping

▸ `Const` **createDefaultMapping**(`fields`: { `id`: *string* ; `name`: *string* ; `required`: *boolean* ; `type`: ``"text"`` \| ``"textarea"``  }[], `theType`: *string*): { `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `fields` | { `id`: *string* ; `name`: *string* ; `required`: *boolean* ; `type`: ``"text"`` \| ``"textarea"``  }[] |
| `theType` | *string* |

**Returns:** { `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]

Defined in: [cases/server/client/configure/utils.ts:103](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/utils.ts#L103)

___

### formatFields

▸ `Const` **formatFields**(`theData`: *unknown*, `theType`: *string*): { `id`: *string* ; `name`: *string* ; `required`: *boolean* ; `type`: ``"text"`` \| ``"textarea"``  }[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `theData` | *unknown* |
| `theType` | *string* |

**Returns:** { `id`: *string* ; `name`: *string* ; `required`: *boolean* ; `type`: ``"text"`` \| ``"textarea"``  }[]

Defined in: [cases/server/client/configure/utils.ts:63](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/utils.ts#L63)

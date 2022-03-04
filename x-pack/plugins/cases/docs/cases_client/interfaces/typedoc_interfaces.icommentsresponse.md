[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICommentsResponse

# Interface: ICommentsResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICommentsResponse

## Hierarchy

- [`CommentsResponse`](../modules/typedoc_interfaces._internal_namespace.md#commentsresponse)

  ↳ **`ICommentsResponse`**

## Table of contents

### Properties

- [comments](typedoc_interfaces.ICommentsResponse.md#comments)
- [page](typedoc_interfaces.ICommentsResponse.md#page)
- [per\_page](typedoc_interfaces.ICommentsResponse.md#per_page)
- [total](typedoc_interfaces.ICommentsResponse.md#total)

## Properties

### comments

• **comments**: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }[]

#### Inherited from

CommentsResponse.comments

___

### page

• **page**: `number` = `rt.number`

#### Inherited from

CommentsResponse.page

___

### per\_page

• **per\_page**: `number` = `rt.number`

#### Inherited from

CommentsResponse.per\_page

___

### total

• **total**: `number` = `rt.number`

#### Inherited from

CommentsResponse.total

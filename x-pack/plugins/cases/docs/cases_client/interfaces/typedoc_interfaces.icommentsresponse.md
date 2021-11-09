[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICommentsResponse

# Interface: ICommentsResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICommentsResponse

## Hierarchy

- *CommentsResponse*

  ↳ **ICommentsResponse**

## Table of contents

### Properties

- [comments](typedoc_interfaces.icommentsresponse.md#comments)
- [page](typedoc_interfaces.icommentsresponse.md#page)
- [per\_page](typedoc_interfaces.icommentsresponse.md#per_page)
- [total](typedoc_interfaces.icommentsresponse.md#total)

## Properties

### comments

• **comments**: { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]

Inherited from: CommentsResponse.comments

___

### page

• **page**: *number*

Inherited from: CommentsResponse.page

___

### per\_page

• **per\_page**: *number*

Inherited from: CommentsResponse.per\_page

___

### total

• **total**: *number*

Inherited from: CommentsResponse.total

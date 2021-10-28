[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ISubCasesFindResponse

# Interface: ISubCasesFindResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ISubCasesFindResponse

## Hierarchy

- *SubCasesFindResponse*

  ↳ **ISubCasesFindResponse**

## Table of contents

### Properties

- [count\_closed\_cases](typedoc_interfaces.isubcasesfindresponse.md#count_closed_cases)
- [count\_in\_progress\_cases](typedoc_interfaces.isubcasesfindresponse.md#count_in_progress_cases)
- [count\_open\_cases](typedoc_interfaces.isubcasesfindresponse.md#count_open_cases)
- [page](typedoc_interfaces.isubcasesfindresponse.md#page)
- [per\_page](typedoc_interfaces.isubcasesfindresponse.md#per_page)
- [subCases](typedoc_interfaces.isubcasesfindresponse.md#subcases)
- [total](typedoc_interfaces.isubcasesfindresponse.md#total)

## Properties

### count\_closed\_cases

• **count\_closed\_cases**: *number*

Inherited from: SubCasesFindResponse.count\_closed\_cases

___

### count\_in\_progress\_cases

• **count\_in\_progress\_cases**: *number*

Inherited from: SubCasesFindResponse.count\_in\_progress\_cases

___

### count\_open\_cases

• **count\_open\_cases**: *number*

Inherited from: SubCasesFindResponse.count\_open\_cases

___

### page

• **page**: *number*

Inherited from: SubCasesFindResponse.page

___

### per\_page

• **per\_page**: *number*

Inherited from: SubCasesFindResponse.per\_page

___

### subCases

• **subCases**: { `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]  }[]

Inherited from: SubCasesFindResponse.subCases

___

### total

• **total**: *number*

Inherited from: SubCasesFindResponse.total

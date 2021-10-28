[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ISubCaseResponse

# Interface: ISubCaseResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ISubCaseResponse

## Hierarchy

- *SubCaseResponse*

  ↳ **ISubCaseResponse**

## Table of contents

### Properties

- [closed\_at](typedoc_interfaces.isubcaseresponse.md#closed_at)
- [closed\_by](typedoc_interfaces.isubcaseresponse.md#closed_by)
- [comments](typedoc_interfaces.isubcaseresponse.md#comments)
- [created\_at](typedoc_interfaces.isubcaseresponse.md#created_at)
- [created\_by](typedoc_interfaces.isubcaseresponse.md#created_by)
- [id](typedoc_interfaces.isubcaseresponse.md#id)
- [owner](typedoc_interfaces.isubcaseresponse.md#owner)
- [status](typedoc_interfaces.isubcaseresponse.md#status)
- [totalAlerts](typedoc_interfaces.isubcaseresponse.md#totalalerts)
- [totalComment](typedoc_interfaces.isubcaseresponse.md#totalcomment)
- [updated\_at](typedoc_interfaces.isubcaseresponse.md#updated_at)
- [updated\_by](typedoc_interfaces.isubcaseresponse.md#updated_by)
- [version](typedoc_interfaces.isubcaseresponse.md#version)

## Properties

### closed\_at

• **closed\_at**: ``null`` \| *string*

Inherited from: SubCaseResponse.closed\_at

___

### closed\_by

• **closed\_by**: ``null`` \| { `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }

Inherited from: SubCaseResponse.closed\_by

___

### comments

• **comments**: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]

Inherited from: SubCaseResponse.comments

___

### created\_at

• **created\_at**: *string*

Inherited from: SubCaseResponse.created\_at

___

### created\_by

• **created\_by**: ``null`` \| { `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }

Inherited from: SubCaseResponse.created\_by

___

### id

• **id**: *string*

Inherited from: SubCaseResponse.id

___

### owner

• **owner**: *string*

Inherited from: SubCaseResponse.owner

___

### status

• **status**: CaseStatuses

Inherited from: SubCaseResponse.status

___

### totalAlerts

• **totalAlerts**: *number*

Inherited from: SubCaseResponse.totalAlerts

___

### totalComment

• **totalComment**: *number*

Inherited from: SubCaseResponse.totalComment

___

### updated\_at

• **updated\_at**: ``null`` \| *string*

Inherited from: SubCaseResponse.updated\_at

___

### updated\_by

• **updated\_by**: ``null`` \| { `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }

Inherited from: SubCaseResponse.updated\_by

___

### version

• **version**: *string*

Inherited from: SubCaseResponse.version

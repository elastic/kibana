[Cases Client API Interface](../cases_client_api.md) / [attachments/update](../modules/attachments_update.md) / UpdateArgs

# Interface: UpdateArgs

[attachments/update](../modules/attachments_update.md).UpdateArgs

Parameters for updating a single attachment

## Table of contents

### Properties

- [caseID](attachments_update.updateargs.md#caseid)
- [subCaseID](attachments_update.updateargs.md#subcaseid)
- [updateRequest](attachments_update.updateargs.md#updaterequest)

## Properties

### caseID

• **caseID**: *string*

The ID of the case that is associated with this attachment

Defined in: [attachments/update.ts:29](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/attachments/update.ts#L29)

___

### subCaseID

• `Optional` **subCaseID**: *string*

The ID of a sub case, if specified a sub case will be searched for to perform the attachment update instead of on a case

Defined in: [attachments/update.ts:37](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/attachments/update.ts#L37)

___

### updateRequest

• **updateRequest**: { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `id`: *string* ; `version`: *string*  }

The full attachment request with the fields updated with appropriate values

Defined in: [attachments/update.ts:33](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/attachments/update.ts#L33)

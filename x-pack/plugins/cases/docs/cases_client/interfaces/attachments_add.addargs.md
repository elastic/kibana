[Cases Client API Interface](../cases_client_api.md) / [attachments/add](../modules/attachments_add.md) / AddArgs

# Interface: AddArgs

[attachments/add](../modules/attachments_add.md).AddArgs

The arguments needed for creating a new attachment to a case.

## Table of contents

### Properties

- [caseId](attachments_add.addargs.md#caseid)
- [comment](attachments_add.addargs.md#comment)

## Properties

### caseId

• **caseId**: *string*

The case ID that this attachment will be associated with

Defined in: [attachments/add.ts:305](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/add.ts#L305)

___

### comment

• **comment**: { `comment`: *string* ; `owner`: *string* ; `type`: user  } \| { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  }

The attachment values.

Defined in: [attachments/add.ts:309](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/add.ts#L309)

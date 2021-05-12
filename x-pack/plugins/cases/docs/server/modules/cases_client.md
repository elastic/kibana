[cases](../server_client_api.md) / cases/client

# Module: cases/client

## Table of contents

### Interfaces

- [CasesSubClient](../interfaces/cases_client.casessubclient.md)

### Functions

- [createCasesSubClient](cases_client.md#createcasessubclient)

## Functions

### createCasesSubClient

▸ `Const` **createCasesSubClient**(`clientArgs`: CasesClientArgs, `casesClient`: [*CasesClient*](../classes/client.casesclient.md), `casesClientInternal`: *CasesClientInternal*): [*CasesSubClient*](../interfaces/cases_client.casessubclient.md)

Creates the interface for CRUD on cases objects.

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientArgs` | CasesClientArgs |
| `casesClient` | [*CasesClient*](../classes/client.casesclient.md) |
| `casesClientInternal` | *CasesClientInternal* |

**Returns:** [*CasesSubClient*](../interfaces/cases_client.casessubclient.md)

Defined in: [cases/server/client/cases/client.ts:109](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/client.ts#L109)

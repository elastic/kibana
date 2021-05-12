[cases](../server_client_api.md) / cases/types

# Module: cases/types

## Table of contents

### Interfaces

- [BasicParams](../interfaces/cases_types.basicparams.md)
- [EntityInformation](../interfaces/cases_types.entityinformation.md)
- [ExternalServiceComment](../interfaces/cases_types.externalservicecomment.md)
- [MapIncident](../interfaces/cases_types.mapincident.md)
- [PipedField](../interfaces/cases_types.pipedfield.md)
- [PrepareFieldsForTransformArgs](../interfaces/cases_types.preparefieldsfortransformargs.md)
- [TransformFieldsArgs](../interfaces/cases_types.transformfieldsargs.md)
- [TransformerArgs](../interfaces/cases_types.transformerargs.md)

### Type aliases

- [ExternalServiceParams](cases_types.md#externalserviceparams)
- [Incident](cases_types.md#incident)
- [PushToServiceApiParams](cases_types.md#pushtoserviceapiparams)
- [Transformer](cases_types.md#transformer)

## Type aliases

### ExternalServiceParams

Ƭ **ExternalServiceParams**: *Record*<string, unknown\>

Defined in: [cases/server/client/cases/types.ts:31](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L31)

___

### Incident

Ƭ **Incident**: JiraIncident \| ResilientIncident \| ServiceNowITSMIncident

Defined in: [cases/server/client/cases/types.ts:24](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L24)

___

### PushToServiceApiParams

Ƭ **PushToServiceApiParams**: JiraPushToServiceApiParams \| ResilientPushToServiceApiParams \| ServiceNowITSMPushToServiceApiParams \| ServiceNowSIRPushToServiceApiParams

Defined in: [cases/server/client/cases/types.ts:25](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L25)

___

### Transformer

Ƭ **Transformer**: (`args`: [*TransformerArgs*](../interfaces/cases_types.transformerargs.md)) => [*TransformerArgs*](../interfaces/cases_types.transformerargs.md)

#### Type declaration

▸ (`args`: [*TransformerArgs*](../interfaces/cases_types.transformerargs.md)): [*TransformerArgs*](../interfaces/cases_types.transformerargs.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | [*TransformerArgs*](../interfaces/cases_types.transformerargs.md) |

**Returns:** [*TransformerArgs*](../interfaces/cases_types.transformerargs.md)

Defined in: [cases/server/client/cases/types.ts:66](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/types.ts#L66)

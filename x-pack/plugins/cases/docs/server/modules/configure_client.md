[cases](../server_client_api.md) / configure/client

# Module: configure/client

## Table of contents

### Interfaces

- [ConfigureSubClient](../interfaces/configure_client.configuresubclient.md)
- [InternalConfigureSubClient](../interfaces/configure_client.internalconfiguresubclient.md)

### Functions

- [createConfigurationSubClient](configure_client.md#createconfigurationsubclient)
- [createInternalConfigurationSubClient](configure_client.md#createinternalconfigurationsubclient)

## Functions

### createConfigurationSubClient

▸ `Const` **createConfigurationSubClient**(`clientArgs`: CasesClientArgs, `casesInternalClient`: *CasesClientInternal*): [*ConfigureSubClient*](../interfaces/configure_client.configuresubclient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientArgs` | CasesClientArgs |
| `casesInternalClient` | *CasesClientInternal* |

**Returns:** [*ConfigureSubClient*](../interfaces/configure_client.configuresubclient.md)

Defined in: [cases/server/client/configure/client.ts:120](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L120)

___

### createInternalConfigurationSubClient

▸ `Const` **createInternalConfigurationSubClient**(`clientArgs`: CasesClientArgs, `casesClientInternal`: *CasesClientInternal*): [*InternalConfigureSubClient*](../interfaces/configure_client.internalconfiguresubclient.md)

These functions should not be exposed on the plugin contract. They are for internal use to support the CRUD of
configurations.

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientArgs` | CasesClientArgs |
| `casesClientInternal` | *CasesClientInternal* |

**Returns:** [*InternalConfigureSubClient*](../interfaces/configure_client.internalconfiguresubclient.md)

Defined in: [cases/server/client/configure/client.ts:104](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L104)

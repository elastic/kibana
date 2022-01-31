[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionTypeRegistryOpts

# Interface: ActionTypeRegistryOpts

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionTypeRegistryOpts

## Table of contents

### Properties

- [actionsConfigUtils](client.__internalNamespace.ActionTypeRegistryOpts.md#actionsconfigutils)
- [licenseState](client.__internalNamespace.ActionTypeRegistryOpts.md#licensestate)
- [licensing](client.__internalNamespace.ActionTypeRegistryOpts.md#licensing)
- [preconfiguredActions](client.__internalNamespace.ActionTypeRegistryOpts.md#preconfiguredactions)
- [taskManager](client.__internalNamespace.ActionTypeRegistryOpts.md#taskmanager)
- [taskRunnerFactory](client.__internalNamespace.ActionTypeRegistryOpts.md#taskrunnerfactory)

## Properties

### actionsConfigUtils

• **actionsConfigUtils**: [`ActionsConfigurationUtilities`](client.__internalNamespace.ActionsConfigurationUtilities.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:11

___

### licenseState

• **licenseState**: [`ILicenseState`](../modules/client.__internalNamespace.md#ilicensestate)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:12

___

### licensing

• **licensing**: [`LicensingPluginSetup`](client.__internalNamespace.LicensingPluginSetup.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:8

___

### preconfiguredActions

• **preconfiguredActions**: [`PreConfiguredAction`](client.__internalNamespace.PreConfiguredAction.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets)\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:13

___

### taskManager

• **taskManager**: [`TaskManagerSetupContract`](client.__internalNamespace.TaskManagerSetupContract.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:9

___

### taskRunnerFactory

• **taskRunnerFactory**: [`TaskRunnerFactory`](../classes/client.__internalNamespace.TaskRunnerFactory.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:10

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionTypeRegistryOpts

# Interface: ActionTypeRegistryOpts

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionTypeRegistryOpts

## Table of contents

### Properties

- [actionsConfigUtils](client._internal_namespace.ActionTypeRegistryOpts.md#actionsconfigutils)
- [licenseState](client._internal_namespace.ActionTypeRegistryOpts.md#licensestate)
- [licensing](client._internal_namespace.ActionTypeRegistryOpts.md#licensing)
- [preconfiguredActions](client._internal_namespace.ActionTypeRegistryOpts.md#preconfiguredactions)
- [taskManager](client._internal_namespace.ActionTypeRegistryOpts.md#taskmanager)
- [taskRunnerFactory](client._internal_namespace.ActionTypeRegistryOpts.md#taskrunnerfactory)

## Properties

### actionsConfigUtils

• **actionsConfigUtils**: [`ActionsConfigurationUtilities`](client._internal_namespace.ActionsConfigurationUtilities.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:11

___

### licenseState

• **licenseState**: [`ILicenseState`](../modules/client._internal_namespace.md#ilicensestate)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:12

___

### licensing

• **licensing**: [`LicensingPluginSetup`](client._internal_namespace.LicensingPluginSetup.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:8

___

### preconfiguredActions

• **preconfiguredActions**: [`PreConfiguredAction`](client._internal_namespace.PreConfiguredAction.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets)\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:13

___

### taskManager

• **taskManager**: [`TaskManagerSetupContract`](client._internal_namespace.TaskManagerSetupContract.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:9

___

### taskRunnerFactory

• **taskRunnerFactory**: [`TaskRunnerFactory`](../classes/client._internal_namespace.TaskRunnerFactory.md)

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:10

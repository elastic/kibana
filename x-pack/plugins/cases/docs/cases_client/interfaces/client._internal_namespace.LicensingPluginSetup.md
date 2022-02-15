[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / LicensingPluginSetup

# Interface: LicensingPluginSetup

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).LicensingPluginSetup

## Table of contents

### Properties

- [featureUsage](client._internal_namespace.LicensingPluginSetup.md#featureusage)
- [license$](client._internal_namespace.LicensingPluginSetup.md#license$)

### Methods

- [refresh](client._internal_namespace.LicensingPluginSetup.md#refresh)

## Properties

### featureUsage

• **featureUsage**: [`FeatureUsageServiceSetup`](client._internal_namespace.FeatureUsageServiceSetup.md)

APIs to register licensed feature usage.

#### Defined in

x-pack/plugins/licensing/target/types/server/types.d.ts:49

___

### license$

• **license$**: `Observable`<[`ILicense`](client._internal_namespace.ILicense.md)\>

Steam of licensing information [ILicense](client._internal_namespace.ILicense.md).

**`deprecated`** in favour of the counterpart provided from start contract

#### Defined in

x-pack/plugins/licensing/target/types/server/types.d.ts:40

## Methods

### refresh

▸ **refresh**(): `Promise`<[`ILicense`](client._internal_namespace.ILicense.md)\>

Triggers licensing information re-fetch.

**`deprecated`** in favour of the counterpart provided from start contract

#### Returns

`Promise`<[`ILicense`](client._internal_namespace.ILicense.md)\>

#### Defined in

x-pack/plugins/licensing/target/types/server/types.d.ts:45

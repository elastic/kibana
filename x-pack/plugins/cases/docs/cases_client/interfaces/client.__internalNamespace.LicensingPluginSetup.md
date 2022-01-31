[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / LicensingPluginSetup

# Interface: LicensingPluginSetup

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).LicensingPluginSetup

## Table of contents

### Properties

- [featureUsage](client.__internalNamespace.LicensingPluginSetup.md#featureusage)
- [license$](client.__internalNamespace.LicensingPluginSetup.md#license$)

### Methods

- [refresh](client.__internalNamespace.LicensingPluginSetup.md#refresh)

## Properties

### featureUsage

• **featureUsage**: [`FeatureUsageServiceSetup`](client.__internalNamespace.FeatureUsageServiceSetup.md)

APIs to register licensed feature usage.

#### Defined in

x-pack/plugins/licensing/target/types/server/types.d.ts:49

___

### license$

• **license$**: `Observable`<[`ILicense`](client.__internalNamespace.ILicense.md)\>

Steam of licensing information [ILicense](client.__internalNamespace.ILicense.md).

**`deprecated`** in favour of the counterpart provided from start contract

#### Defined in

x-pack/plugins/licensing/target/types/server/types.d.ts:40

## Methods

### refresh

▸ **refresh**(): `Promise`<[`ILicense`](client.__internalNamespace.ILicense.md)\>

Triggers licensing information re-fetch.

**`deprecated`** in favour of the counterpart provided from start contract

#### Returns

`Promise`<[`ILicense`](client.__internalNamespace.ILicense.md)\>

#### Defined in

x-pack/plugins/licensing/target/types/server/types.d.ts:45

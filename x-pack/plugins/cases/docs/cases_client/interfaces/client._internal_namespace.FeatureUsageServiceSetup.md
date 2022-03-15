[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / FeatureUsageServiceSetup

# Interface: FeatureUsageServiceSetup

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).FeatureUsageServiceSetup

## Table of contents

### Methods

- [register](client._internal_namespace.FeatureUsageServiceSetup.md#register)

## Methods

### register

▸ **register**(`featureName`, `licenseType`): `void`

Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.

#### Parameters

| Name | Type |
| :------ | :------ |
| `featureName` | `string` |
| `licenseType` | ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"`` |

#### Returns

`void`

#### Defined in

x-pack/plugins/licensing/target/types/server/services/feature_usage_service.d.ts:7

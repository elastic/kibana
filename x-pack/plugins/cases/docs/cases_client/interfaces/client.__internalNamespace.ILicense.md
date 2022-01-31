[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ILicense

# Interface: ILicense

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ILicense

## Table of contents

### Properties

- [error](client.__internalNamespace.ILicense.md#error)
- [expiryDateInMillis](client.__internalNamespace.ILicense.md#expirydateinmillis)
- [isActive](client.__internalNamespace.ILicense.md#isactive)
- [isAvailable](client.__internalNamespace.ILicense.md#isavailable)
- [mode](client.__internalNamespace.ILicense.md#mode)
- [signature](client.__internalNamespace.ILicense.md#signature)
- [status](client.__internalNamespace.ILicense.md#status)
- [type](client.__internalNamespace.ILicense.md#type)
- [uid](client.__internalNamespace.ILicense.md#uid)

### Methods

- [check](client.__internalNamespace.ILicense.md#check)
- [getFeature](client.__internalNamespace.ILicense.md#getfeature)
- [getUnavailableReason](client.__internalNamespace.ILicense.md#getunavailablereason)
- [hasAtLeast](client.__internalNamespace.ILicense.md#hasatleast)
- [toJSON](client.__internalNamespace.ILicense.md#tojson)

## Properties

### error

• `Optional` **error**: `string`

A potential error denoting the failure of the license from being retrieved.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:119

___

### expiryDateInMillis

• `Optional` **expiryDateInMillis**: `number`

Unix epoch of the expiration date of the license.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:94

___

### isActive

• **isActive**: `boolean`

Determine if the status of the license is active.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:90

___

### isAvailable

• **isAvailable**: `boolean`

Determine if the license container has information.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:111

___

### mode

• `Optional` **mode**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

The license type, being usually one of basic, standard, gold, platinum, or trial.

**`deprecated`** use 'type' instead.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:103

___

### signature

• **signature**: `string`

Signature of the license content.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:107

___

### status

• `Optional` **status**: [`LicenseStatus`](../modules/client.__internalNamespace.md#licensestatus)

The validity status of the license.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:86

___

### type

• `Optional` **type**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

The license type, being usually one of basic, standard, gold, platinum, or trial.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:98

___

### uid

• `Optional` **uid**: `string`

UID for license.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:82

## Methods

### check

▸ **check**(`pluginName`, `minimumLicenseRequired`): [`LicenseCheck`](client.__internalNamespace.LicenseCheck.md)

For a given plugin and license type, receive information about the status of the license.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `pluginName` | `string` | the name of the plugin |
| `minimumLicenseRequired` | ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"`` | the minimum valid license for operating the given plugin |

#### Returns

[`LicenseCheck`](client.__internalNamespace.LicenseCheck.md)

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:134

___

### getFeature

▸ **getFeature**(`name`): [`LicenseFeature`](client.__internalNamespace.LicenseFeature.md)

A specific API for interacting with the specific features of the license.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name of the feature to interact with |

#### Returns

[`LicenseFeature`](client.__internalNamespace.LicenseFeature.md)

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:139

___

### getUnavailableReason

▸ **getUnavailableReason**(): `undefined` \| `string`

If the license is not available, provides a string or Error containing the reason.

#### Returns

`undefined` \| `string`

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:123

___

### hasAtLeast

▸ **hasAtLeast**(`minimumLicenseRequired`): `boolean`

Determine if license type >= minimal required license type.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `minimumLicenseRequired` | ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"`` | the minimum valid license required for the given feature |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:128

___

### toJSON

▸ **toJSON**(): [`PublicLicenseJSON`](client.__internalNamespace.PublicLicenseJSON.md)

Returns

#### Returns

[`PublicLicenseJSON`](client.__internalNamespace.PublicLicenseJSON.md)

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:115

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / PublicLicense

# Interface: PublicLicense

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).PublicLicense

Subset of license data considered as non-sensitive information.
Can be passed to the client.

## Table of contents

### Properties

- [expiryDateInMillis](client.__internalNamespace.PublicLicense.md#expirydateinmillis)
- [mode](client.__internalNamespace.PublicLicense.md#mode)
- [status](client.__internalNamespace.PublicLicense.md#status)
- [type](client.__internalNamespace.PublicLicense.md#type)
- [uid](client.__internalNamespace.PublicLicense.md#uid)

## Properties

### expiryDateInMillis

• **expiryDateInMillis**: `number`

Unix epoch of the expiration date of the license.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:36

___

### mode

• **mode**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

The license type, being usually one of basic, standard, gold, platinum, or trial.

**`deprecated`** use 'type' instead

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:45

___

### status

• **status**: [`LicenseStatus`](../modules/client.__internalNamespace.md#licensestatus)

The validity status of the license.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:32

___

### type

• **type**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

The license type, being usually one of basic, standard, gold, platinum, or trial.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:40

___

### uid

• **uid**: `string`

UID for license.

#### Defined in

x-pack/plugins/licensing/target/types/common/types.d.ts:28

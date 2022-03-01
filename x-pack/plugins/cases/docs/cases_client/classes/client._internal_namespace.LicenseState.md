[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / LicenseState

# Class: LicenseState

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).LicenseState

## Table of contents

### Constructors

- [constructor](client._internal_namespace.LicenseState.md#constructor)

### Properties

- [\_notifyUsage](client._internal_namespace.LicenseState.md#_notifyusage)
- [license](client._internal_namespace.LicenseState.md#license)
- [licenseInformation](client._internal_namespace.LicenseState.md#licenseinformation)
- [notifyUsage](client._internal_namespace.LicenseState.md#notifyusage)
- [subscription](client._internal_namespace.LicenseState.md#subscription)
- [updateInformation](client._internal_namespace.LicenseState.md#updateinformation)

### Methods

- [checkLicense](client._internal_namespace.LicenseState.md#checklicense)
- [clean](client._internal_namespace.LicenseState.md#clean)
- [ensureLicenseForActionType](client._internal_namespace.LicenseState.md#ensurelicenseforactiontype)
- [getLicenseInformation](client._internal_namespace.LicenseState.md#getlicenseinformation)
- [isLicenseValidForActionType](client._internal_namespace.LicenseState.md#islicensevalidforactiontype)
- [setNotifyUsage](client._internal_namespace.LicenseState.md#setnotifyusage)

## Constructors

### constructor

• **new LicenseState**(`license$`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `license$` | `Observable`<[`ILicense`](../interfaces/client._internal_namespace.ILicense.md)\> |

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:17

## Properties

### \_notifyUsage

• `Private` **\_notifyUsage**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:16

___

### license

• `Private` `Optional` **license**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:15

___

### licenseInformation

• `Private` **licenseInformation**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:13

___

### notifyUsage

• `Private` **notifyUsage**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:30

___

### subscription

• `Private` **subscription**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:14

___

### updateInformation

• `Private` **updateInformation**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:18

## Methods

### checkLicense

▸ **checkLicense**(`license`): [`ActionsLicenseInformation`](../interfaces/client._internal_namespace.ActionsLicenseInformation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `license` | `undefined` \| [`ILicense`](../interfaces/client._internal_namespace.ILicense.md) |

#### Returns

[`ActionsLicenseInformation`](../interfaces/client._internal_namespace.ActionsLicenseInformation.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:32

___

### clean

▸ **clean**(): `void`

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:20

___

### ensureLicenseForActionType

▸ **ensureLicenseForActionType**(`actionType`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionType` | [`ActionType`](../interfaces/client._internal_namespace.ActionType-1.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets), [`ActionTypeParams`](../modules/client._internal_namespace.md#actiontypeparams), `void`\> |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:31

___

### getLicenseInformation

▸ **getLicenseInformation**(): [`ActionsLicenseInformation`](../interfaces/client._internal_namespace.ActionsLicenseInformation.md)

#### Returns

[`ActionsLicenseInformation`](../interfaces/client._internal_namespace.ActionsLicenseInformation.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:21

___

### isLicenseValidForActionType

▸ **isLicenseValidForActionType**(`actionType`, `__namedParameters?`): { `isValid`: ``true``  } \| { `isValid`: ``false`` ; `reason`: ``"unavailable"`` \| ``"expired"`` \| ``"invalid"``  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionType` | [`ActionType`](../interfaces/client._internal_namespace.ActionType-1.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets), [`ActionTypeParams`](../modules/client._internal_namespace.md#actiontypeparams), `void`\> |
| `__namedParameters?` | `Object` |
| `__namedParameters.notifyUsage` | `boolean` |

#### Returns

{ `isValid`: ``true``  } \| { `isValid`: ``false`` ; `reason`: ``"unavailable"`` \| ``"expired"`` \| ``"invalid"``  }

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:22

___

### setNotifyUsage

▸ **setNotifyUsage**(`notifyUsage`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `notifyUsage` | (`featureName`: `string`, `usedAt?`: `number` \| `Date`) => `void` |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:19

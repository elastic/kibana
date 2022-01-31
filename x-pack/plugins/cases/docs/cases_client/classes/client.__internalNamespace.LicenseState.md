[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / LicenseState

# Class: LicenseState

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).LicenseState

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.LicenseState.md#constructor)

### Properties

- [\_notifyUsage](client.__internalNamespace.LicenseState.md#_notifyusage)
- [license](client.__internalNamespace.LicenseState.md#license)
- [licenseInformation](client.__internalNamespace.LicenseState.md#licenseinformation)
- [notifyUsage](client.__internalNamespace.LicenseState.md#notifyusage)
- [subscription](client.__internalNamespace.LicenseState.md#subscription)
- [updateInformation](client.__internalNamespace.LicenseState.md#updateinformation)

### Methods

- [checkLicense](client.__internalNamespace.LicenseState.md#checklicense)
- [clean](client.__internalNamespace.LicenseState.md#clean)
- [ensureLicenseForActionType](client.__internalNamespace.LicenseState.md#ensurelicenseforactiontype)
- [getLicenseInformation](client.__internalNamespace.LicenseState.md#getlicenseinformation)
- [isLicenseValidForActionType](client.__internalNamespace.LicenseState.md#islicensevalidforactiontype)
- [setNotifyUsage](client.__internalNamespace.LicenseState.md#setnotifyusage)

## Constructors

### constructor

• **new LicenseState**(`license$`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `license$` | `Observable`<[`ILicense`](../interfaces/client.__internalNamespace.ILicense.md)\> |

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

▸ **checkLicense**(`license`): [`ActionsLicenseInformation`](../interfaces/client.__internalNamespace.ActionsLicenseInformation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `license` | `undefined` \| [`ILicense`](../interfaces/client.__internalNamespace.ILicense.md) |

#### Returns

[`ActionsLicenseInformation`](../interfaces/client.__internalNamespace.ActionsLicenseInformation.md)

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
| `actionType` | [`ActionType`](../interfaces/client.__internalNamespace.ActionType-1.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets), [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams), `void`\> |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:31

___

### getLicenseInformation

▸ **getLicenseInformation**(): [`ActionsLicenseInformation`](../interfaces/client.__internalNamespace.ActionsLicenseInformation.md)

#### Returns

[`ActionsLicenseInformation`](../interfaces/client.__internalNamespace.ActionsLicenseInformation.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/license_state.d.ts:21

___

### isLicenseValidForActionType

▸ **isLicenseValidForActionType**(`actionType`, `__namedParameters?`): { `isValid`: ``true``  } \| { `isValid`: ``false`` ; `reason`: ``"unavailable"`` \| ``"expired"`` \| ``"invalid"``  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionType` | [`ActionType`](../interfaces/client.__internalNamespace.ActionType-1.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets), [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams), `void`\> |
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

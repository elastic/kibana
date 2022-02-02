[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / KibanaFeatureConfig

# Interface: KibanaFeatureConfig

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).KibanaFeatureConfig

Interface for registering a feature.
Feature registration allows plugins to hide their applications with spaces,
and secure access when configured for security.

## Table of contents

### Properties

- [alerting](client._internal_namespace.KibanaFeatureConfig.md#alerting)
- [app](client._internal_namespace.KibanaFeatureConfig.md#app)
- [cases](client._internal_namespace.KibanaFeatureConfig.md#cases)
- [catalogue](client._internal_namespace.KibanaFeatureConfig.md#catalogue)
- [category](client._internal_namespace.KibanaFeatureConfig.md#category)
- [excludeFromBasePrivileges](client._internal_namespace.KibanaFeatureConfig.md#excludefrombaseprivileges)
- [id](client._internal_namespace.KibanaFeatureConfig.md#id)
- [management](client._internal_namespace.KibanaFeatureConfig.md#management)
- [minimumLicense](client._internal_namespace.KibanaFeatureConfig.md#minimumlicense)
- [name](client._internal_namespace.KibanaFeatureConfig.md#name)
- [order](client._internal_namespace.KibanaFeatureConfig.md#order)
- [privileges](client._internal_namespace.KibanaFeatureConfig.md#privileges)
- [privilegesTooltip](client._internal_namespace.KibanaFeatureConfig.md#privilegestooltip)
- [reserved](client._internal_namespace.KibanaFeatureConfig.md#reserved)
- [subFeatures](client._internal_namespace.KibanaFeatureConfig.md#subfeatures)

## Properties

### alerting

• `Optional` **alerting**: readonly `string`[]

If your feature grants access to specific Alert Types, you can specify them here to control visibility based on the current space.
Include both Alert Types registered by the feature and external Alert Types such as built-in
Alert Types and Alert Types provided by other features to which you wish to grant access.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:83

___

### app

• **app**: readonly `string`[]

An array of app ids that are enabled when this feature is enabled.
Apps specified here will automatically cascade to the privileges defined below, unless specified differently there.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:54

___

### cases

• `Optional` **cases**: readonly `string`[]

If your feature grants access to specific case types, you can specify them here to control visibility based on the current space.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:87

___

### catalogue

• `Optional` **catalogue**: readonly `string`[]

If this feature includes a catalogue entry, you can specify them here to control visibility based on the current space.

Items specified here will automatically cascade to the privileges defined below, unless specified differently there.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:77

___

### category

• **category**: [`AppCategory`](client._internal_namespace.AppCategory.md)

The category for this feature.
This will be used to organize the list of features for display within the
Spaces and Roles management screens.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:30

___

### excludeFromBasePrivileges

• `Optional` **excludeFromBasePrivileges**: `boolean`

Whether or not this feature should be excluded from the base privileges.
This is primarily helpful when migrating applications with a "legacy" privileges model
to use Kibana privileges. We don't want these features to be considered part of the `all`
or `read` base privileges in a minor release if the user was previously granted access
using an additional reserved role.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:42

___

### id

• **id**: `string`

Unique identifier for this feature.
This identifier is also used when generating UI Capabilities.

**`see`** UICapabilities

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:19

___

### management

• `Optional` **management**: `Object`

If this feature includes management sections, you can specify them here to control visibility of those
pages based on the current space.

Items specified here will automatically cascade to the privileges defined below, unless specified differently there.

**`example`**
```ts
 // Enables access to the "Advanced Settings" management page within the Kibana section
 management: {
   kibana: ['settings']
 }
```

#### Index signature

▪ [sectionId: `string`]: readonly `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:69

___

### minimumLicense

• `Optional` **minimumLicense**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

Optional minimum supported license.
If omitted, all licenses are allowed.
This does not restrict access to your feature based on license.
Its only purpose is to inform the space and roles UIs on which features to display.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:49

___

### name

• **name**: `string`

Display name for this feature.
This will be displayed to end-users, so a translatable string is advised for i18n.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:24

___

### order

• `Optional` **order**: `number`

An ordinal used to sort features relative to one another for display.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:34

___

### privileges

• **privileges**: ``null`` \| { `all`: [`FeatureKibanaPrivileges`](client._internal_namespace.FeatureKibanaPrivileges.md) ; `read`: [`FeatureKibanaPrivileges`](client._internal_namespace.FeatureKibanaPrivileges.md)  }

Feature privilege definition.

**`example`**
```ts
 {
   all: {...},
   read: {...}
 }
```

**`see`** FeatureKibanaPrivileges

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:100

___

### privilegesTooltip

• `Optional` **privilegesTooltip**: `string`

Optional message to display on the Role Management screen when configuring permissions for this feature.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:111

___

### reserved

• `Optional` `Private` **reserved**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description` | `string` |
| `privileges` | readonly [`ReservedKibanaPrivilege`](client._internal_namespace.ReservedKibanaPrivilege.md)[] |

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:115

___

### subFeatures

• `Optional` **subFeatures**: readonly [`SubFeatureConfig`](client._internal_namespace.SubFeatureConfig.md)[]

Optional sub-feature privilege definitions. This can only be specified if `privileges` are are also defined.

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:107

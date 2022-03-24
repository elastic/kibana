[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SubFeaturePrivilegeConfig

# Interface: SubFeaturePrivilegeConfig

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SubFeaturePrivilegeConfig

Configuration for a sub-feature privilege.

## Hierarchy

- `Omit`<[`FeatureKibanaPrivileges`](client._internal_namespace.FeatureKibanaPrivileges.md), ``"excludeFromBasePrivileges"``\>

  ↳ **`SubFeaturePrivilegeConfig`**

## Table of contents

### Properties

- [alerting](client._internal_namespace.SubFeaturePrivilegeConfig.md#alerting)
- [api](client._internal_namespace.SubFeaturePrivilegeConfig.md#api)
- [app](client._internal_namespace.SubFeaturePrivilegeConfig.md#app)
- [cases](client._internal_namespace.SubFeaturePrivilegeConfig.md#cases)
- [catalogue](client._internal_namespace.SubFeaturePrivilegeConfig.md#catalogue)
- [disabled](client._internal_namespace.SubFeaturePrivilegeConfig.md#disabled)
- [id](client._internal_namespace.SubFeaturePrivilegeConfig.md#id)
- [includeIn](client._internal_namespace.SubFeaturePrivilegeConfig.md#includein)
- [management](client._internal_namespace.SubFeaturePrivilegeConfig.md#management)
- [minimumLicense](client._internal_namespace.SubFeaturePrivilegeConfig.md#minimumlicense)
- [name](client._internal_namespace.SubFeaturePrivilegeConfig.md#name)
- [requireAllSpaces](client._internal_namespace.SubFeaturePrivilegeConfig.md#requireallspaces)
- [savedObject](client._internal_namespace.SubFeaturePrivilegeConfig.md#savedobject)
- [ui](client._internal_namespace.SubFeaturePrivilegeConfig.md#ui)

## Properties

### alerting

• `Optional` **alerting**: `Object`

If your feature requires access to specific Alert Types, then specify your access needs here.
Include both Alert Types registered by the feature and external Alert Types such as built-in
Alert Types and Alert Types provided by other features to which you wish to grant access.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `alert?` | `Object` |
| `alert.all?` | readonly `string`[] |
| `alert.read?` | readonly `string`[] |
| `rule?` | `Object` |
| `rule.all?` | readonly `string`[] |
| `rule.read?` | readonly `string`[] |

#### Inherited from

Omit.alerting

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:82

___

### api

• `Optional` **api**: readonly `string`[]

If your feature includes server-side APIs, you can tag those routes to secure access based on user permissions.

**`example`**
```ts
 // Configure your routes with a tag starting with the 'access:' prefix
 server.route({
   path: '/api/my-route',
   method: 'GET',
   handler: () => { ...},
   options: {
     tags: ['access:my_feature-admin']
   }
 });

 Then, specify the tags here (without the 'access:' prefix) which should be secured:

 {
   api: ['my_feature-admin']
 }
```

NOTE: It is important to name your tags in a way that will not collide with other plugins/features.
A generic tag name like "access:read" could be used elsewhere, and access to that API endpoint would also
extend to any routes you have also tagged with that name.

#### Inherited from

Omit.api

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:64

___

### app

• `Optional` **app**: readonly `string`[]

If your feature exposes a client-side application (most of them do!), then you can control access to them here.

**`example`**
```ts
 {
   app: ['my-app', 'kibana']
 }
```

#### Inherited from

Omit.app

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:76

___

### cases

• `Optional` **cases**: `Object`

If your feature requires access to specific owners of cases (aka plugins that have created cases), then specify your access needs here. The values here should
be unique identifiers for the owners of cases you want access to.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `all?` | readonly `string`[] | List of case owners which users should have full read/write access to when granted this privilege.  **`example`** ```ts  {    all: ['securitySolution']  } ``` |
| `read?` | readonly `string`[] | List of case owners which users should have read-only access to when granted this privilege.  **`example`** ```ts  {    read: ['securitySolution']  } ``` |

#### Inherited from

Omit.cases

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:132

___

### catalogue

• `Optional` **catalogue**: readonly `string`[]

If this feature includes a catalogue entry, you can specify them here to control visibility based on user permissions.

#### Inherited from

Omit.catalogue

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:37

___

### disabled

• `Optional` **disabled**: `boolean`

Whether or not this privilege should be hidden in the roles UI and disallowed on the API. Defaults to `false`.

**`deprecated`**

#### Inherited from

Omit.disabled

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:18

___

### id

• **id**: `string`

Identifier for this privilege. Must be unique across all other privileges within a feature.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:47

___

### includeIn

• **includeIn**: ``"all"`` \| ``"none"`` \| ``"read"``

Denotes which Primary Feature Privilege this sub-feature privilege should be included in.
`read` is also included in `all` automatically.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:56

___

### management

• `Optional` **management**: `Object`

If this feature includes management sections, you can specify them here to control visibility of those
pages based on user privileges.

**`example`**
```ts
 // Enables access to the "Advanced Settings" management page within the Kibana section
 management: {
   kibana: ['settings']
 }
```

#### Index signature

▪ [sectionId: `string`]: readonly `string`[]

#### Inherited from

Omit.management

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:31

___

### minimumLicense

• `Optional` **minimumLicense**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

The minimum supported license level for this sub-feature privilege.
If no license level is supplied, then this privilege will be available for all licences
that are valid for the overall feature.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:62

___

### name

• **name**: `string`

The display name for this privilege.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:51

___

### requireAllSpaces

• `Optional` **requireAllSpaces**: `boolean`

Whether or not this privilege should only be granted to `All Spaces *`. Should be used for features that do not
support Spaces. Defaults to `false`.

#### Inherited from

Omit.requireAllSpaces

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:13

___

### savedObject

• **savedObject**: `Object`

If your feature requires access to specific saved objects, then specify your access needs here.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `all` | readonly `string`[] | List of saved object types which users should have full read/write access to when granted this privilege.  **`example`** ```ts  {    all: ['my-saved-object-type']  } ``` |
| `read` | readonly `string`[] | List of saved object types which users should have read-only access to when granted this privilege.  **`example`** ```ts  {    read: ['config']  } ``` |

#### Inherited from

Omit.savedObject

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:157

___

### ui

• **ui**: readonly `string`[]

A list of UI Capabilities that should be granted to users with this privilege.
These capabilities will automatically be namespaces within your feature id.

**`example`**
```ts
 {
   ui: ['show', 'save']
 }

 This translates in the UI to the following (assuming a feature id of "foo"):
 import { uiCapabilities } from 'ui/capabilities';

 const canShowApp = uiCapabilities.foo.show;
 const canSave = uiCapabilities.foo.save;
```
Note: Since these are automatically namespaced, you are free to use generic names like "show" and "save".

**`see`** UICapabilities

#### Inherited from

Omit.ui

#### Defined in

x-pack/plugins/features/target/types/common/feature_kibana_privileges.d.ts:199

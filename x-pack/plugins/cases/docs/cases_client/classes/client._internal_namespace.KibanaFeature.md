[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / KibanaFeature

# Class: KibanaFeature

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).KibanaFeature

## Table of contents

### Constructors

- [constructor](client._internal_namespace.KibanaFeature.md#constructor)

### Properties

- [config](client._internal_namespace.KibanaFeature.md#config)
- [subFeatures](client._internal_namespace.KibanaFeature.md#subfeatures)

### Accessors

- [alerting](client._internal_namespace.KibanaFeature.md#alerting)
- [app](client._internal_namespace.KibanaFeature.md#app)
- [cases](client._internal_namespace.KibanaFeature.md#cases)
- [catalogue](client._internal_namespace.KibanaFeature.md#catalogue)
- [category](client._internal_namespace.KibanaFeature.md#category)
- [excludeFromBasePrivileges](client._internal_namespace.KibanaFeature.md#excludefrombaseprivileges)
- [id](client._internal_namespace.KibanaFeature.md#id)
- [management](client._internal_namespace.KibanaFeature.md#management)
- [minimumLicense](client._internal_namespace.KibanaFeature.md#minimumlicense)
- [name](client._internal_namespace.KibanaFeature.md#name)
- [order](client._internal_namespace.KibanaFeature.md#order)
- [privileges](client._internal_namespace.KibanaFeature.md#privileges)
- [reserved](client._internal_namespace.KibanaFeature.md#reserved)

### Methods

- [toRaw](client._internal_namespace.KibanaFeature.md#toraw)

## Constructors

### constructor

• **new KibanaFeature**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Readonly`<{ `alerting?`: readonly `string`[] ; `app`: readonly `string`[] ; `cases?`: readonly `string`[] ; `catalogue?`: readonly `string`[] ; `category`: `Readonly`<{ id: string; label: string; ariaLabel?: string \| undefined; order?: number \| undefined; euiIconType?: string \| undefined; }\> ; `excludeFromBasePrivileges?`: `boolean` ; `id`: `string` ; `management?`: `Readonly`<{ [x: string]: readonly string[]; }\> ; `minimumLicense?`: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"`` ; `name`: `string` ; `order?`: `number` ; `privileges`: ``null`` \| `Readonly`<{ all: Readonly<{ excludeFromBasePrivileges?: boolean \| undefined; requireAllSpaces?: boolean \| undefined; disabled?: boolean \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 6 more ...; ui: readonly string[]; }\>; read: Readonly<...\>; }\> ; `privilegesTooltip?`: `string` ; `reserved?`: `Readonly`<{ description: string; privileges: readonly Readonly<{ id: string; privilege: Readonly<{ excludeFromBasePrivileges?: boolean \| undefined; requireAllSpaces?: boolean \| undefined; disabled?: boolean \| undefined; ... 7 more ...; ui: readonly string[]; }\>; }\>[]; }\> ; `subFeatures?`: readonly `Readonly`<{ name: string; privilegeGroups: readonly Readonly<{ groupType: SubFeaturePrivilegeGroupType; privileges: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; ... 10 more ...; ui: readonly string[]; }\>[]; }\>[]; }\>[]  }\> |

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:123

## Properties

### config

• `Protected` `Readonly` **config**: `Readonly`<{ `alerting?`: readonly `string`[] ; `app`: readonly `string`[] ; `cases?`: readonly `string`[] ; `catalogue?`: readonly `string`[] ; `category`: `Readonly`<{ id: string; label: string; ariaLabel?: string \| undefined; order?: number \| undefined; euiIconType?: string \| undefined; }\> ; `excludeFromBasePrivileges?`: `boolean` ; `id`: `string` ; `management?`: `Readonly`<{ [x: string]: readonly string[]; }\> ; `minimumLicense?`: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"`` ; `name`: `string` ; `order?`: `number` ; `privileges`: ``null`` \| `Readonly`<{ all: Readonly<{ excludeFromBasePrivileges?: boolean \| undefined; requireAllSpaces?: boolean \| undefined; disabled?: boolean \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 6 more ...; ui: readonly string[]; }\>; read: Readonly<...\>; }\> ; `privilegesTooltip?`: `string` ; `reserved?`: `Readonly`<{ description: string; privileges: readonly Readonly<{ id: string; privilege: Readonly<{ excludeFromBasePrivileges?: boolean \| undefined; requireAllSpaces?: boolean \| undefined; disabled?: boolean \| undefined; ... 7 more ...; ui: readonly string[]; }\>; }\>[]; }\> ; `subFeatures?`: readonly `Readonly`<{ name: string; privilegeGroups: readonly Readonly<{ groupType: SubFeaturePrivilegeGroupType; privileges: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; ... 10 more ...; ui: readonly string[]; }\>[]; }\>[]; }\>[]  }\>

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:121

___

### subFeatures

• `Readonly` **subFeatures**: [`SubFeature`](client._internal_namespace.SubFeature.md)[]

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:122

## Accessors

### alerting

• `get` **alerting**(): `undefined` \| readonly `string`[]

#### Returns

`undefined` \| readonly `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:202

___

### app

• `get` **app**(): readonly `string`[]

#### Returns

readonly `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:134

___

### cases

• `get` **cases**(): `undefined` \| readonly `string`[]

#### Returns

`undefined` \| readonly `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:203

___

### catalogue

• `get` **catalogue**(): `undefined` \| readonly `string`[]

#### Returns

`undefined` \| readonly `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:135

___

### category

• `get` **category**(): `Readonly`<{ `ariaLabel?`: `string` ; `euiIconType?`: `string` ; `id`: `string` ; `label`: `string` ; `order?`: `number`  }\>

#### Returns

`Readonly`<{ `ariaLabel?`: `string` ; `euiIconType?`: `string` ; `id`: `string` ; `label`: `string` ; `order?`: `number`  }\>

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:127

___

### excludeFromBasePrivileges

• `get` **excludeFromBasePrivileges**(): `boolean`

#### Returns

`boolean`

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:204

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:124

___

### management

• `get` **management**(): `undefined` \| `Readonly`<{ [x: string]: readonly `string`[];  }\>

#### Returns

`undefined` \| `Readonly`<{ [x: string]: readonly `string`[];  }\>

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:136

___

### minimumLicense

• `get` **minimumLicense**(): `undefined` \| ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

#### Returns

`undefined` \| ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:139

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:125

___

### order

• `get` **order**(): `undefined` \| `number`

#### Returns

`undefined` \| `number`

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:126

___

### privileges

• `get` **privileges**(): ``null`` \| `Readonly`<{ `all`: `Readonly`<{ `alerting?`: `Readonly`<{ `alert?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `rule?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\>  }\> ; `api?`: readonly `string`[] ; `app?`: readonly `string`[] ; `cases?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `catalogue?`: readonly `string`[] ; `disabled?`: `boolean` ; `excludeFromBasePrivileges?`: `boolean` ; `management?`: `Readonly`<{ [x: string]: readonly `string`[];  }\> ; `requireAllSpaces?`: `boolean` ; `savedObject`: `Readonly`<{ `all`: readonly `string`[] ; `read`: readonly `string`[]  }\> ; `ui`: readonly `string`[]  }\> ; `read`: `Readonly`<{ `alerting?`: `Readonly`<{ `alert?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `rule?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\>  }\> ; `api?`: readonly `string`[] ; `app?`: readonly `string`[] ; `cases?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `catalogue?`: readonly `string`[] ; `disabled?`: `boolean` ; `excludeFromBasePrivileges?`: `boolean` ; `management?`: `Readonly`<{ [x: string]: readonly `string`[];  }\> ; `requireAllSpaces?`: `boolean` ; `savedObject`: `Readonly`<{ `all`: readonly `string`[] ; `read`: readonly `string`[]  }\> ; `ui`: readonly `string`[]  }\>  }\>

#### Returns

``null`` \| `Readonly`<{ `all`: `Readonly`<{ `alerting?`: `Readonly`<{ `alert?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `rule?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\>  }\> ; `api?`: readonly `string`[] ; `app?`: readonly `string`[] ; `cases?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `catalogue?`: readonly `string`[] ; `disabled?`: `boolean` ; `excludeFromBasePrivileges?`: `boolean` ; `management?`: `Readonly`<{ [x: string]: readonly `string`[];  }\> ; `requireAllSpaces?`: `boolean` ; `savedObject`: `Readonly`<{ `all`: readonly `string`[] ; `read`: readonly `string`[]  }\> ; `ui`: readonly `string`[]  }\> ; `read`: `Readonly`<{ `alerting?`: `Readonly`<{ `alert?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `rule?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\>  }\> ; `api?`: readonly `string`[] ; `app?`: readonly `string`[] ; `cases?`: `Readonly`<{ `all?`: readonly `string`[] ; `read?`: readonly `string`[]  }\> ; `catalogue?`: readonly `string`[] ; `disabled?`: `boolean` ; `excludeFromBasePrivileges?`: `boolean` ; `management?`: `Readonly`<{ [x: string]: readonly `string`[];  }\> ; `requireAllSpaces?`: `boolean` ; `savedObject`: `Readonly`<{ `all`: readonly `string`[] ; `read`: readonly `string`[]  }\> ; `ui`: readonly `string`[]  }\>  }\>

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:140

___

### reserved

• `get` **reserved**(): `undefined` \| `Readonly`<{ `description`: `string` ; `privileges`: readonly `Readonly`<{ `id`: `string` ; `privilege`: `Readonly`<{ `alerting?`: `Readonly`<{ `alert?`: `Readonly`<{ `all?`: readonly string[] ; `read?`: readonly string[]  }\> ; `rule?`: `Readonly`<{ `all?`: readonly string[] ; `read?`: readonly string[]  }\>  }\> ; `api?`: readonly string[] ; `app?`: readonly string[] ; `cases?`: `Readonly`<{ `all?`: readonly string[] ; `read?`: readonly string[]  }\> ; `catalogue?`: readonly string[] ; `disabled?`: `boolean` ; `excludeFromBasePrivileges?`: `boolean` ; `management?`: `Readonly`<{ [x: string]: readonly `string`[];  }\> ; `requireAllSpaces?`: `boolean` ; `savedObject`: `Readonly`<{ `all`: readonly string[] ; `read`: readonly string[]  }\> ; `ui`: readonly string[]  }\>  }\>[]  }\>

#### Returns

`undefined` \| `Readonly`<{ `description`: `string` ; `privileges`: readonly `Readonly`<{ `id`: `string` ; `privilege`: `Readonly`<{ `alerting?`: `Readonly`<{ `alert?`: `Readonly`<{ `all?`: readonly string[] ; `read?`: readonly string[]  }\> ; `rule?`: `Readonly`<{ `all?`: readonly string[] ; `read?`: readonly string[]  }\>  }\> ; `api?`: readonly string[] ; `app?`: readonly string[] ; `cases?`: `Readonly`<{ `all?`: readonly string[] ; `read?`: readonly string[]  }\> ; `catalogue?`: readonly string[] ; `disabled?`: `boolean` ; `excludeFromBasePrivileges?`: `boolean` ; `management?`: `Readonly`<{ [x: string]: readonly `string`[];  }\> ; `requireAllSpaces?`: `boolean` ; `savedObject`: `Readonly`<{ `all`: readonly string[] ; `read`: readonly string[]  }\> ; `ui`: readonly string[]  }\>  }\>[]  }\>

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:205

## Methods

### toRaw

▸ **toRaw**(): [`KibanaFeatureConfig`](../interfaces/client._internal_namespace.KibanaFeatureConfig.md)

#### Returns

[`KibanaFeatureConfig`](../interfaces/client._internal_namespace.KibanaFeatureConfig.md)

#### Defined in

x-pack/plugins/features/target/types/common/kibana_feature.d.ts:241

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SubFeature

# Class: SubFeature

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SubFeature

## Table of contents

### Constructors

- [constructor](client._internal_namespace.SubFeature.md#constructor)

### Properties

- [config](client._internal_namespace.SubFeature.md#config)

### Accessors

- [name](client._internal_namespace.SubFeature.md#name)
- [privilegeGroups](client._internal_namespace.SubFeature.md#privilegegroups)

### Methods

- [toRaw](client._internal_namespace.SubFeature.md#toraw)

## Constructors

### constructor

• **new SubFeature**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Readonly`<{ `name`: `string` ; `privilegeGroups`: readonly `Readonly`<{ groupType: SubFeaturePrivilegeGroupType; privileges: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| ... 4 more ... \| undefined; ... 9 more ...; ui: readonly string[]; }\>[]; }\>[]  }\> |

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:66

## Properties

### config

• `Protected` `Readonly` **config**: `Readonly`<{ `name`: `string` ; `privilegeGroups`: readonly `Readonly`<{ groupType: SubFeaturePrivilegeGroupType; privileges: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| ... 4 more ... \| undefined; ... 9 more ...; ui: readonly string[]; }\>[]; }\>[]  }\>

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:65

## Accessors

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:67

___

### privilegeGroups

• `get` **privilegeGroups**(): readonly `Readonly`<{ `groupType`: [`SubFeaturePrivilegeGroupType`](../modules/client._internal_namespace.md#subfeatureprivilegegrouptype) ; `privileges`: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| "gold" \| "platinum" \| "enterprise" \| "trial" \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 8 more ...; savedObject: Readonly<...\>; }\>[]  }\>[]

#### Returns

readonly `Readonly`<{ `groupType`: [`SubFeaturePrivilegeGroupType`](../modules/client._internal_namespace.md#subfeatureprivilegegrouptype) ; `privileges`: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| "gold" \| "platinum" \| "enterprise" \| "trial" \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 8 more ...; savedObject: Readonly<...\>; }\>[]  }\>[]

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:68

## Methods

### toRaw

▸ **toRaw**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `privilegeGroups` | readonly `Readonly`<{ `groupType`: [`SubFeaturePrivilegeGroupType`](../modules/client._internal_namespace.md#subfeatureprivilegegrouptype) ; `privileges`: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| "gold" \| "platinum" \| "enterprise" \| "trial" \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 8 more ...; savedObject: Readonly<...\>; }\>[]  }\>[] |

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:104

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SubFeature

# Class: SubFeature

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SubFeature

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.SubFeature.md#constructor)

### Properties

- [config](client.__internalNamespace.SubFeature.md#config)

### Accessors

- [name](client.__internalNamespace.SubFeature.md#name)
- [privilegeGroups](client.__internalNamespace.SubFeature.md#privilegegroups)

### Methods

- [toRaw](client.__internalNamespace.SubFeature.md#toraw)

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

• `get` **privilegeGroups**(): readonly `Readonly`<{ `groupType`: [`SubFeaturePrivilegeGroupType`](../modules/client.__internalNamespace.md#subfeatureprivilegegrouptype) ; `privileges`: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| "gold" \| "platinum" \| "enterprise" \| "trial" \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 8 more ...; savedObject: Readonly<...\>; }\>[]  }\>[]

#### Returns

readonly `Readonly`<{ `groupType`: [`SubFeaturePrivilegeGroupType`](../modules/client.__internalNamespace.md#subfeatureprivilegegrouptype) ; `privileges`: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| "gold" \| "platinum" \| "enterprise" \| "trial" \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 8 more ...; savedObject: Readonly<...\>; }\>[]  }\>[]

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
| `privilegeGroups` | readonly `Readonly`<{ `groupType`: [`SubFeaturePrivilegeGroupType`](../modules/client.__internalNamespace.md#subfeatureprivilegegrouptype) ; `privileges`: readonly Readonly<{ id: string; name: string; includeIn: "all" \| "none" \| "read"; minimumLicense?: "basic" \| "standard" \| "gold" \| "platinum" \| "enterprise" \| "trial" \| undefined; management?: Readonly<{ [x: string]: readonly string[]; }\> \| undefined; ... 8 more ...; savedObject: Readonly<...\>; }\>[]  }\>[] |

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:104

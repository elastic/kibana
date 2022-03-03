[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SubFeaturePrivilegeGroupConfig

# Interface: SubFeaturePrivilegeGroupConfig

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SubFeaturePrivilegeGroupConfig

Configuration for a sub-feature privilege group.

## Table of contents

### Properties

- [groupType](client._internal_namespace.SubFeaturePrivilegeGroupConfig.md#grouptype)
- [privileges](client._internal_namespace.SubFeaturePrivilegeGroupConfig.md#privileges)

## Properties

### groupType

• **groupType**: [`SubFeaturePrivilegeGroupType`](../modules/client._internal_namespace.md#subfeatureprivilegegrouptype)

The type of privilege group.
- `mutually_exclusive`::
    Users will be able to select at most one privilege within this group.
    Privileges must be specified in descending order of permissiveness (e.g. `All`, `Read`, not `Read`, `All)
- `independent`::
    Users will be able to select any combination of privileges within this group.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:34

___

### privileges

• **privileges**: readonly [`SubFeaturePrivilegeConfig`](client._internal_namespace.SubFeaturePrivilegeConfig.md)[]

The privileges which belong to this group.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:38

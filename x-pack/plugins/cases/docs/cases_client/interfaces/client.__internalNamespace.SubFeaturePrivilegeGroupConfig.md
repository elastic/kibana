[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SubFeaturePrivilegeGroupConfig

# Interface: SubFeaturePrivilegeGroupConfig

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SubFeaturePrivilegeGroupConfig

Configuration for a sub-feature privilege group.

## Table of contents

### Properties

- [groupType](client.__internalNamespace.SubFeaturePrivilegeGroupConfig.md#grouptype)
- [privileges](client.__internalNamespace.SubFeaturePrivilegeGroupConfig.md#privileges)

## Properties

### groupType

• **groupType**: [`SubFeaturePrivilegeGroupType`](../modules/client.__internalNamespace.md#subfeatureprivilegegrouptype)

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

• **privileges**: readonly [`SubFeaturePrivilegeConfig`](client.__internalNamespace.SubFeaturePrivilegeConfig.md)[]

The privileges which belong to this group.

#### Defined in

x-pack/plugins/features/target/types/common/sub_feature.d.ts:38

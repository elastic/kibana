[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ElasticsearchFeatureConfig

# Interface: ElasticsearchFeatureConfig

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ElasticsearchFeatureConfig

Interface for registering an Elasticsearch feature.
Feature registration allows plugins to hide their applications based
on configured cluster or index privileges.

## Table of contents

### Properties

- [catalogue](client._internal_namespace.ElasticsearchFeatureConfig.md#catalogue)
- [id](client._internal_namespace.ElasticsearchFeatureConfig.md#id)
- [management](client._internal_namespace.ElasticsearchFeatureConfig.md#management)
- [privileges](client._internal_namespace.ElasticsearchFeatureConfig.md#privileges)

## Properties

### catalogue

• `Optional` **catalogue**: `string`[]

If this feature includes a catalogue entry, you can specify them here to control visibility based on the current space.

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:34

___

### id

• **id**: `string`

Unique identifier for this feature.
This identifier is also used when generating UI Capabilities.

**`see`** UICapabilities

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:15

___

### management

• `Optional` **management**: `Object`

Management sections associated with this feature.

**`example`**
```ts
 // Enables access to the "Advanced Settings" management page within the Kibana section
 management: {
   kibana: ['settings']
 }
```

#### Index signature

▪ [sectionId: `string`]: `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:27

___

### privileges

• **privileges**: [`FeatureElasticsearchPrivileges`](client._internal_namespace.FeatureElasticsearchPrivileges.md)[]

Feature privilege definition. Specify one or more privileges which grant access to this feature.
Users must satisfy all privileges in at least one of the defined sets of privileges in order to be granted access.

**`example`**
```ts
 [{
    requiredClusterPrivileges: ['monitor'],
    requiredIndexPrivileges: {
       ['metricbeat-*']: ['read', 'view_index_metadata']
    }
 }]
```

**`see`** FeatureElasticsearchPrivileges

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:50

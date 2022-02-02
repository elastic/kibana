[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / FeatureElasticsearchPrivileges

# Interface: FeatureElasticsearchPrivileges

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).FeatureElasticsearchPrivileges

Elasticsearch Feature privilege definition

## Table of contents

### Properties

- [requiredClusterPrivileges](client._internal_namespace.FeatureElasticsearchPrivileges.md#requiredclusterprivileges)
- [requiredIndexPrivileges](client._internal_namespace.FeatureElasticsearchPrivileges.md#requiredindexprivileges)
- [requiredRoles](client._internal_namespace.FeatureElasticsearchPrivileges.md#requiredroles)
- [ui](client._internal_namespace.FeatureElasticsearchPrivileges.md#ui)

## Properties

### requiredClusterPrivileges

• **requiredClusterPrivileges**: `string`[]

A set of Elasticsearch cluster privileges which are required for this feature to be enabled.
See https://www.elastic.co/guide/en/elasticsearch/reference/current/security-privileges.html

#### Defined in

x-pack/plugins/features/target/types/common/feature_elasticsearch_privileges.d.ts:10

___

### requiredIndexPrivileges

• `Optional` **requiredIndexPrivileges**: `Object`

A set of Elasticsearch index privileges which are required for this feature to be enabled, keyed on index name or pattern.
See https://www.elastic.co/guide/en/elasticsearch/reference/current/security-privileges.html#privileges-list-indices

**`example`**

Requiring `read` access to `logstash-*` and `all` access to `foo-*`
```ts
feature.registerElasticsearchPrivilege({
  privileges: [{
    requiredIndexPrivileges: {
      ['logstash-*']: ['read'],
      ['foo-*]: ['all']
    }
  }]
})
```

#### Index signature

▪ [indexName: `string`]: `string`[]

#### Defined in

x-pack/plugins/features/target/types/common/feature_elasticsearch_privileges.d.ts:30

___

### requiredRoles

• `Optional` **requiredRoles**: `string`[]

A set of Elasticsearch roles which are required for this feature to be enabled.

**`deprecated`** do not rely on hard-coded role names.

This is relied on by the reporting feature, and should be removed once reporting
migrates to using the Kibana Privilege model: https://github.com/elastic/kibana/issues/19914

#### Defined in

x-pack/plugins/features/target/types/common/feature_elasticsearch_privileges.d.ts:41

___

### ui

• **ui**: `string`[]

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

#### Defined in

x-pack/plugins/features/target/types/common/feature_elasticsearch_privileges.d.ts:62

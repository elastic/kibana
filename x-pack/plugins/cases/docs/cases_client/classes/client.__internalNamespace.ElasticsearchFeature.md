[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ElasticsearchFeature

# Class: ElasticsearchFeature

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ElasticsearchFeature

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ElasticsearchFeature.md#constructor)

### Properties

- [config](client.__internalNamespace.ElasticsearchFeature.md#config)

### Accessors

- [catalogue](client.__internalNamespace.ElasticsearchFeature.md#catalogue)
- [id](client.__internalNamespace.ElasticsearchFeature.md#id)
- [management](client.__internalNamespace.ElasticsearchFeature.md#management)
- [privileges](client.__internalNamespace.ElasticsearchFeature.md#privileges)

### Methods

- [toRaw](client.__internalNamespace.ElasticsearchFeature.md#toraw)

## Constructors

### constructor

• **new ElasticsearchFeature**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Readonly`<{ `catalogue?`: `RecursiveReadonlyArray`<`string`\> ; `id`: `string` ; `management?`: `Readonly`<{ [x: string]: RecursiveReadonlyArray<string\>; }\> ; `privileges`: `RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client.__internalNamespace.FeatureElasticsearchPrivileges.md)\>  }\> |

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:54

## Properties

### config

• `Protected` `Readonly` **config**: `Readonly`<{ `catalogue?`: `RecursiveReadonlyArray`<`string`\> ; `id`: `string` ; `management?`: `Readonly`<{ [x: string]: RecursiveReadonlyArray<string\>; }\> ; `privileges`: `RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client.__internalNamespace.FeatureElasticsearchPrivileges.md)\>  }\>

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:53

## Accessors

### catalogue

• `get` **catalogue**(): `undefined` \| `RecursiveReadonlyArray`<`string`\>

#### Returns

`undefined` \| `RecursiveReadonlyArray`<`string`\>

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:56

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:55

___

### management

• `get` **management**(): `undefined` \| `Readonly`<{ [x: string]: `RecursiveReadonlyArray`;  }\>

#### Returns

`undefined` \| `Readonly`<{ [x: string]: `RecursiveReadonlyArray`;  }\>

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:57

___

### privileges

• `get` **privileges**(): `RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client.__internalNamespace.FeatureElasticsearchPrivileges.md)\>

#### Returns

`RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client.__internalNamespace.FeatureElasticsearchPrivileges.md)\>

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:60

## Methods

### toRaw

▸ **toRaw**(): [`ElasticsearchFeatureConfig`](../interfaces/client.__internalNamespace.ElasticsearchFeatureConfig.md)

#### Returns

[`ElasticsearchFeatureConfig`](../interfaces/client.__internalNamespace.ElasticsearchFeatureConfig.md)

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:61

[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ElasticsearchFeature

# Class: ElasticsearchFeature

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ElasticsearchFeature

## Table of contents

### Constructors

- [constructor](client._internal_namespace.ElasticsearchFeature.md#constructor)

### Properties

- [config](client._internal_namespace.ElasticsearchFeature.md#config)

### Accessors

- [catalogue](client._internal_namespace.ElasticsearchFeature.md#catalogue)
- [id](client._internal_namespace.ElasticsearchFeature.md#id)
- [management](client._internal_namespace.ElasticsearchFeature.md#management)
- [privileges](client._internal_namespace.ElasticsearchFeature.md#privileges)

### Methods

- [toRaw](client._internal_namespace.ElasticsearchFeature.md#toraw)

## Constructors

### constructor

• **new ElasticsearchFeature**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Readonly`<{ `catalogue?`: `RecursiveReadonlyArray`<`string`\> ; `id`: `string` ; `management?`: `Readonly`<{ [x: string]: RecursiveReadonlyArray<string\>; }\> ; `privileges`: `RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client._internal_namespace.FeatureElasticsearchPrivileges.md)\>  }\> |

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:54

## Properties

### config

• `Protected` `Readonly` **config**: `Readonly`<{ `catalogue?`: `RecursiveReadonlyArray`<`string`\> ; `id`: `string` ; `management?`: `Readonly`<{ [x: string]: RecursiveReadonlyArray<string\>; }\> ; `privileges`: `RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client._internal_namespace.FeatureElasticsearchPrivileges.md)\>  }\>

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

• `get` **privileges**(): `RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client._internal_namespace.FeatureElasticsearchPrivileges.md)\>

#### Returns

`RecursiveReadonlyArray`<[`FeatureElasticsearchPrivileges`](../interfaces/client._internal_namespace.FeatureElasticsearchPrivileges.md)\>

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:60

## Methods

### toRaw

▸ **toRaw**(): [`ElasticsearchFeatureConfig`](../interfaces/client._internal_namespace.ElasticsearchFeatureConfig.md)

#### Returns

[`ElasticsearchFeatureConfig`](../interfaces/client._internal_namespace.ElasticsearchFeatureConfig.md)

#### Defined in

x-pack/plugins/features/target/types/common/elasticsearch_feature.d.ts:61

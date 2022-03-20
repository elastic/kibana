[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsType

# Interface: SavedObjectsType<Attributes\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsType

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `any` |

## Table of contents

### Properties

- [convertToAliasScript](client._internal_namespace.SavedObjectsType.md#converttoaliasscript)
- [convertToMultiNamespaceTypeVersion](client._internal_namespace.SavedObjectsType.md#converttomultinamespacetypeversion)
- [excludeOnUpgrade](client._internal_namespace.SavedObjectsType.md#excludeonupgrade)
- [hidden](client._internal_namespace.SavedObjectsType.md#hidden)
- [indexPattern](client._internal_namespace.SavedObjectsType.md#indexpattern)
- [management](client._internal_namespace.SavedObjectsType.md#management)
- [mappings](client._internal_namespace.SavedObjectsType.md#mappings)
- [migrations](client._internal_namespace.SavedObjectsType.md#migrations)
- [name](client._internal_namespace.SavedObjectsType.md#name)
- [namespaceType](client._internal_namespace.SavedObjectsType.md#namespacetype)
- [schemas](client._internal_namespace.SavedObjectsType.md#schemas)

## Properties

### convertToAliasScript

• `Optional` **convertToAliasScript**: `string`

If defined, will be used to convert the type to an alias.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:235

___

### convertToMultiNamespaceTypeVersion

• `Optional` **convertToMultiNamespaceTypeVersion**: `string`

If defined, objects of this type will be converted to a 'multiple' or 'multiple-isolated' namespace type when migrating to this
version.

Requirements:

 1. This string value must be a valid semver version
 2. This type must have previously specified [`namespaceType: 'single'`](../modules/client._internal_namespace.md#savedobjectsnamespacetype)
 3. This type must also specify [`namespaceType: 'multiple'`](../modules/client._internal_namespace.md#savedobjectsnamespacetype) *or*
    [`namespaceType: 'multiple-isolated'`](../modules/client._internal_namespace.md#savedobjectsnamespacetype)

Example of a single-namespace type in 7.12:

```ts
{
  name: 'foo',
  hidden: false,
  namespaceType: 'single',
  mappings: {...}
}
```

Example after converting to a multi-namespace (isolated) type in 8.0:

```ts
{
  name: 'foo',
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {...},
  convertToMultiNamespaceTypeVersion: '8.0.0'
}
```

Example after converting to a multi-namespace (shareable) type in 8.1:

```ts
{
  name: 'foo',
  hidden: false,
  namespaceType: 'multiple',
  mappings: {...},
  convertToMultiNamespaceTypeVersion: '8.0.0'
}
```

Note: migration function(s) can be optionally specified for any of these versions and will not interfere with the conversion process.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:305

___

### excludeOnUpgrade

• `Optional` **excludeOnUpgrade**: [`SavedObjectTypeExcludeFromUpgradeFilterHook`](../modules/client._internal_namespace.md#savedobjecttypeexcludefromupgradefilterhook)

If defined, allows a type to exclude unneeded documents from the migration process and effectively be deleted.
See [SavedObjectTypeExcludeFromUpgradeFilterHook](../modules/client._internal_namespace.md#savedobjecttypeexcludefromupgradefilterhook) for more details.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:240

___

### hidden

• **hidden**: `boolean`

Is the type hidden by default. If true, repositories will not have access to this type unless explicitly
declared as an `extraType` when creating the repository.

See {@link SavedObjectsServiceStart.createInternalRepository | createInternalRepository}.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:223

___

### indexPattern

• `Optional` **indexPattern**: `string`

If defined, the type instances will be stored in the given index instead of the default one.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:231

___

### management

• `Optional` **management**: [`SavedObjectsTypeManagementDefinition`](client._internal_namespace.SavedObjectsTypeManagementDefinition.md)<`Attributes`\>

An optional [saved objects management section](client._internal_namespace.SavedObjectsTypeManagementDefinition.md) definition for the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:309

___

### mappings

• **mappings**: [`SavedObjectsTypeMappingDefinition`](client._internal_namespace.SavedObjectsTypeMappingDefinition.md)

The [mapping definition](client._internal_namespace.SavedObjectsTypeMappingDefinition.md) for the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:244

___

### migrations

• `Optional` **migrations**: [`SavedObjectMigrationMap`](client._internal_namespace.SavedObjectMigrationMap.md) \| () => [`SavedObjectMigrationMap`](client._internal_namespace.SavedObjectMigrationMap.md)

An optional map of [migrations](../modules/client._internal_namespace.md#savedobjectmigrationfn) or a function returning a map of [migrations](../modules/client._internal_namespace.md#savedobjectmigrationfn) to be used to migrate the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:248

___

### name

• **name**: `string`

The name of the type, which is also used as the internal id.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:216

___

### namespaceType

• **namespaceType**: [`SavedObjectsNamespaceType`](../modules/client._internal_namespace.md#savedobjectsnamespacetype)

The [namespace type](../modules/client._internal_namespace.md#savedobjectsnamespacetype) for the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:227

___

### schemas

• `Optional` **schemas**: [`SavedObjectsValidationMap`](client._internal_namespace.SavedObjectsValidationMap.md) \| () => [`SavedObjectsValidationMap`](client._internal_namespace.SavedObjectsValidationMap.md)

An optional schema that can be used to validate the attributes of the type.

When provided, calls to [create](../classes/client._internal_namespace.SavedObjectsClient.md#create) will be validated against this schema.

See [SavedObjectsValidationMap](client._internal_namespace.SavedObjectsValidationMap.md) for more details.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:256

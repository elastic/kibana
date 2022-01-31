[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsType

# Interface: SavedObjectsType<Attributes\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsType

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `any` |

## Table of contents

### Properties

- [convertToAliasScript](client.__internalNamespace.SavedObjectsType.md#converttoaliasscript)
- [convertToMultiNamespaceTypeVersion](client.__internalNamespace.SavedObjectsType.md#converttomultinamespacetypeversion)
- [excludeOnUpgrade](client.__internalNamespace.SavedObjectsType.md#excludeonupgrade)
- [hidden](client.__internalNamespace.SavedObjectsType.md#hidden)
- [indexPattern](client.__internalNamespace.SavedObjectsType.md#indexpattern)
- [management](client.__internalNamespace.SavedObjectsType.md#management)
- [mappings](client.__internalNamespace.SavedObjectsType.md#mappings)
- [migrations](client.__internalNamespace.SavedObjectsType.md#migrations)
- [name](client.__internalNamespace.SavedObjectsType.md#name)
- [namespaceType](client.__internalNamespace.SavedObjectsType.md#namespacetype)
- [schemas](client.__internalNamespace.SavedObjectsType.md#schemas)

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
 2. This type must have previously specified [`namespaceType: 'single'`](../modules/client.__internalNamespace.md#savedobjectsnamespacetype)
 3. This type must also specify [`namespaceType: 'multiple'`](../modules/client.__internalNamespace.md#savedobjectsnamespacetype) *or*
    [`namespaceType: 'multiple-isolated'`](../modules/client.__internalNamespace.md#savedobjectsnamespacetype)

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

• `Optional` **excludeOnUpgrade**: [`SavedObjectTypeExcludeFromUpgradeFilterHook`](../modules/client.__internalNamespace.md#savedobjecttypeexcludefromupgradefilterhook)

If defined, allows a type to exclude unneeded documents from the migration process and effectively be deleted.
See [SavedObjectTypeExcludeFromUpgradeFilterHook](../modules/client.__internalNamespace.md#savedobjecttypeexcludefromupgradefilterhook) for more details.

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

• `Optional` **management**: [`SavedObjectsTypeManagementDefinition`](client.__internalNamespace.SavedObjectsTypeManagementDefinition.md)<`Attributes`\>

An optional [saved objects management section](client.__internalNamespace.SavedObjectsTypeManagementDefinition.md) definition for the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:309

___

### mappings

• **mappings**: [`SavedObjectsTypeMappingDefinition`](client.__internalNamespace.SavedObjectsTypeMappingDefinition.md)

The [mapping definition](client.__internalNamespace.SavedObjectsTypeMappingDefinition.md) for the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:244

___

### migrations

• `Optional` **migrations**: [`SavedObjectMigrationMap`](client.__internalNamespace.SavedObjectMigrationMap.md) \| () => [`SavedObjectMigrationMap`](client.__internalNamespace.SavedObjectMigrationMap.md)

An optional map of [migrations](../modules/client.__internalNamespace.md#savedobjectmigrationfn) or a function returning a map of [migrations](../modules/client.__internalNamespace.md#savedobjectmigrationfn) to be used to migrate the type.

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

• **namespaceType**: [`SavedObjectsNamespaceType`](../modules/client.__internalNamespace.md#savedobjectsnamespacetype)

The [namespace type](../modules/client.__internalNamespace.md#savedobjectsnamespacetype) for the type.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:227

___

### schemas

• `Optional` **schemas**: [`SavedObjectsValidationMap`](client.__internalNamespace.SavedObjectsValidationMap.md) \| () => [`SavedObjectsValidationMap`](client.__internalNamespace.SavedObjectsValidationMap.md)

An optional schema that can be used to validate the attributes of the type.

When provided, calls to [create](../classes/client.__internalNamespace.SavedObjectsClient.md#create) will be validated against this schema.

See [SavedObjectsValidationMap](client.__internalNamespace.SavedObjectsValidationMap.md) for more details.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:256

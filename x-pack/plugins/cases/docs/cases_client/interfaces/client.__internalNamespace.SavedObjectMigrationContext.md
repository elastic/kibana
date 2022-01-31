[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectMigrationContext

# Interface: SavedObjectMigrationContext

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectMigrationContext

Migration context provided when invoking a [migration handler](../modules/client.__internalNamespace.md#savedobjectmigrationfn)

## Table of contents

### Properties

- [convertToMultiNamespaceTypeVersion](client.__internalNamespace.SavedObjectMigrationContext.md#converttomultinamespacetypeversion)
- [isSingleNamespaceType](client.__internalNamespace.SavedObjectMigrationContext.md#issinglenamespacetype)
- [log](client.__internalNamespace.SavedObjectMigrationContext.md#log)
- [migrationVersion](client.__internalNamespace.SavedObjectMigrationContext.md#migrationversion)

## Properties

### convertToMultiNamespaceTypeVersion

• `Optional` `Readonly` **convertToMultiNamespaceTypeVersion**: `string`

The version in which this object type is being converted to a multi-namespace type

#### Defined in

src/core/target/types/server/saved_objects/migrations/types.d.ts:57

___

### isSingleNamespaceType

• `Readonly` **isSingleNamespaceType**: `boolean`

Whether this is a single-namespace type or not

#### Defined in

src/core/target/types/server/saved_objects/migrations/types.d.ts:61

___

### log

• `Readonly` **log**: [`SavedObjectsMigrationLogger`](client.__internalNamespace.SavedObjectsMigrationLogger.md)

logger instance to be used by the migration handler

#### Defined in

src/core/target/types/server/saved_objects/migrations/types.d.ts:49

___

### migrationVersion

• `Readonly` **migrationVersion**: `string`

The migration version that this migration function is defined for

#### Defined in

src/core/target/types/server/saved_objects/migrations/types.d.ts:53

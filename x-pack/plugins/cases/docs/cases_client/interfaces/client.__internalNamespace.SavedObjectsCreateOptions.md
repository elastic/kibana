[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsCreateOptions

# Interface: SavedObjectsCreateOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsCreateOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsCreateOptions`**

## Table of contents

### Properties

- [coreMigrationVersion](client.__internalNamespace.SavedObjectsCreateOptions.md#coremigrationversion)
- [id](client.__internalNamespace.SavedObjectsCreateOptions.md#id)
- [initialNamespaces](client.__internalNamespace.SavedObjectsCreateOptions.md#initialnamespaces)
- [migrationVersion](client.__internalNamespace.SavedObjectsCreateOptions.md#migrationversion)
- [namespace](client.__internalNamespace.SavedObjectsCreateOptions.md#namespace)
- [originId](client.__internalNamespace.SavedObjectsCreateOptions.md#originid)
- [overwrite](client.__internalNamespace.SavedObjectsCreateOptions.md#overwrite)
- [references](client.__internalNamespace.SavedObjectsCreateOptions.md#references)
- [refresh](client.__internalNamespace.SavedObjectsCreateOptions.md#refresh)
- [version](client.__internalNamespace.SavedObjectsCreateOptions.md#version)

## Properties

### coreMigrationVersion

• `Optional` **coreMigrationVersion**: `string`

A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
current Kibana version, it will result in an error.

**`remarks`**
Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
field set and you want to create it again.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:29

___

### id

• `Optional` **id**: `string`

(not recommended) Specify an id for the document

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:10

___

### initialNamespaces

• `Optional` **initialNamespaces**: `string`[]

Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
[SavedObjectsCreateOptions](client.__internalNamespace.SavedObjectsCreateOptions.md).

* For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
  including the "All spaces" identifier (`'*'`).
* For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
  be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
* For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:45

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client.__internalNamespace.SavedObjectsMigrationVersion.md)

{@inheritDoc SavedObjectsMigrationVersion}

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:19

___

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client.__internalNamespace.SavedObjectsBaseOptions.md).[namespace](client.__internalNamespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### originId

• `Optional` **originId**: `string`

Optional ID of the original saved object, if this object's `id` was regenerated

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:34

___

### overwrite

• `Optional` **overwrite**: `boolean`

Overwrite existing documents (defaults to false)

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:12

___

### references

• `Optional` **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:30

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client.__internalNamespace.md#mutatingoperationrefreshsetting)

The Elasticsearch Refresh setting for this operation

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:32

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation.
Can be used in conjunction with `overwrite` for implementing optimistic concurrency control.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:17

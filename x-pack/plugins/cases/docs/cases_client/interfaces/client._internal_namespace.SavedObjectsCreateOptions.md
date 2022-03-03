[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsCreateOptions

# Interface: SavedObjectsCreateOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsCreateOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsCreateOptions`**

## Table of contents

### Properties

- [coreMigrationVersion](client._internal_namespace.SavedObjectsCreateOptions.md#coremigrationversion)
- [id](client._internal_namespace.SavedObjectsCreateOptions.md#id)
- [initialNamespaces](client._internal_namespace.SavedObjectsCreateOptions.md#initialnamespaces)
- [migrationVersion](client._internal_namespace.SavedObjectsCreateOptions.md#migrationversion)
- [namespace](client._internal_namespace.SavedObjectsCreateOptions.md#namespace)
- [originId](client._internal_namespace.SavedObjectsCreateOptions.md#originid)
- [overwrite](client._internal_namespace.SavedObjectsCreateOptions.md#overwrite)
- [references](client._internal_namespace.SavedObjectsCreateOptions.md#references)
- [refresh](client._internal_namespace.SavedObjectsCreateOptions.md#refresh)
- [version](client._internal_namespace.SavedObjectsCreateOptions.md#version)

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
[SavedObjectsCreateOptions](client._internal_namespace.SavedObjectsCreateOptions.md).

* For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
  including the "All spaces" identifier (`'*'`).
* For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
  be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
* For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:45

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client._internal_namespace.SavedObjectsMigrationVersion.md)

{@inheritDoc SavedObjectsMigrationVersion}

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:19

___

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client._internal_namespace.SavedObjectsBaseOptions.md).[namespace](client._internal_namespace.SavedObjectsBaseOptions.md#namespace)

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

• `Optional` **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:30

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client._internal_namespace.md#mutatingoperationrefreshsetting)

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

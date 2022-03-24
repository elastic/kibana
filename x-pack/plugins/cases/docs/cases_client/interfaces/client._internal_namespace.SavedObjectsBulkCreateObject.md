[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsBulkCreateObject

# Interface: SavedObjectsBulkCreateObject<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsBulkCreateObject

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Table of contents

### Properties

- [attributes](client._internal_namespace.SavedObjectsBulkCreateObject.md#attributes)
- [coreMigrationVersion](client._internal_namespace.SavedObjectsBulkCreateObject.md#coremigrationversion)
- [id](client._internal_namespace.SavedObjectsBulkCreateObject.md#id)
- [initialNamespaces](client._internal_namespace.SavedObjectsBulkCreateObject.md#initialnamespaces)
- [migrationVersion](client._internal_namespace.SavedObjectsBulkCreateObject.md#migrationversion)
- [originId](client._internal_namespace.SavedObjectsBulkCreateObject.md#originid)
- [references](client._internal_namespace.SavedObjectsBulkCreateObject.md#references)
- [type](client._internal_namespace.SavedObjectsBulkCreateObject.md#type)
- [version](client._internal_namespace.SavedObjectsBulkCreateObject.md#version)

## Properties

### attributes

• **attributes**: `T`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:54

___

### coreMigrationVersion

• `Optional` **coreMigrationVersion**: `string`

A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
current Kibana version, it will result in an error.

**`remarks`**
Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
field set and you want to create it again.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:68

___

### id

• `Optional` **id**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:52

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

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:81

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client._internal_namespace.SavedObjectsMigrationVersion.md)

{@inheritDoc SavedObjectsMigrationVersion}

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:58

___

### originId

• `Optional` **originId**: `string`

Optional ID of the original saved object, if this object's `id` was regenerated

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:70

___

### references

• `Optional` **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:56

___

### type

• **type**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:53

___

### version

• `Optional` **version**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:55

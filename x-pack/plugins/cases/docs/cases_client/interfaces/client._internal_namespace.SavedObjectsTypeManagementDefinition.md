[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsTypeManagementDefinition

# Interface: SavedObjectsTypeManagementDefinition<Attributes\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsTypeManagementDefinition

Configuration options for the [type](client._internal_namespace.SavedObjectsType.md)'s management section.

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `any` |

## Table of contents

### Properties

- [defaultSearchField](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#defaultsearchfield)
- [displayName](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#displayname)
- [icon](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#icon)
- [importableAndExportable](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#importableandexportable)
- [isExportable](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#isexportable)
- [onExport](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#onexport)
- [onImport](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#onimport)
- [visibleInManagement](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#visibleinmanagement)

### Methods

- [getEditUrl](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#getediturl)
- [getInAppUrl](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#getinappurl)
- [getTitle](client._internal_namespace.SavedObjectsTypeManagementDefinition.md#gettitle)

## Properties

### defaultSearchField

• `Optional` **defaultSearchField**: `string`

The default search field to use for this type. Defaults to `id`.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:337

___

### displayName

• `Optional` **displayName**: `string`

When specified, will be used instead of the type's name in SO management section's labels.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:324

___

### icon

• `Optional` **icon**: `string`

The eui icon name to display in the management table.
If not defined, the default icon will be used.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:342

___

### importableAndExportable

• `Optional` **importableAndExportable**: `boolean`

Is the type importable or exportable. Defaults to `false`.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:320

___

### isExportable

• `Optional` **isExportable**: [`SavedObjectsExportablePredicate`](../modules/client._internal_namespace.md#savedobjectsexportablepredicate)<`Attributes`\>

Optional hook to specify whether an object should be exportable.

If specified, `isExportable` will be called during export for each
of this type's objects in the export, and the ones not matching the
predicate will be excluded from the export.

When implementing both `isExportable` and `onExport`, it is mandatory that
`isExportable` returns the same value for an object before and after going
though the export transform.
E.g `isExportable(objectBeforeTransform) === isExportable(objectAfterTransform)`

**`example`**
Registering a type with a per-object exportability predicate
```ts
// src/plugins/my_plugin/server/plugin.ts
import { myType } from './saved_objects';

export class Plugin() {
  setup: (core: CoreSetup) => {
    core.savedObjects.registerType({
       ...myType,
       management: {
         ...myType.management,
         isExportable: (object) => {
           if (object.attributes.myCustomAttr === 'foo') {
             return false;
           }
           return true;
         }
       },
    });
  }
}
```

**`remarks`** `importableAndExportable` must be `true` to specify this property.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:462

___

### onExport

• `Optional` **onExport**: [`SavedObjectsExportTransform`](../modules/client._internal_namespace.md#savedobjectsexporttransform)<`Attributes`\>

An optional export transform function that can be used transform the objects of the registered type during
the export process.

It can be used to either mutate the exported objects, or add additional objects (of any type) to the export list.

See [the transform type documentation](../modules/client._internal_namespace.md#savedobjectsexporttransform) for more info and examples.

When implementing both `isExportable` and `onExport`, it is mandatory that
`isExportable` returns the same value for an object before and after going
though the export transform.
E.g `isExportable(objectBeforeTransform) === isExportable(objectAfterTransform)`

**`remarks`** `importableAndExportable` must be `true` to specify this property.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:380

___

### onImport

• `Optional` **onImport**: [`SavedObjectsImportHook`](../modules/client._internal_namespace.md#savedobjectsimporthook)<`Attributes`\>

An optional [import hook](../modules/client._internal_namespace.md#savedobjectsimporthook) to use when importing given type.

Import hooks are executed during the savedObjects import process and allow to interact
with the imported objects. See the [hook documentation](../modules/client._internal_namespace.md#savedobjectsimporthook)
for more info.

**`example`**
Registering a hook displaying a warning about a specific type of object
```ts
// src/plugins/my_plugin/server/plugin.ts
import { myType } from './saved_objects';

export class Plugin() {
  setup: (core: CoreSetup) => {
    core.savedObjects.registerType({
       ...myType,
       management: {
         ...myType.management,
         onImport: (objects) => {
           if(someActionIsNeeded(objects)) {
             return {
                warnings: [
                  {
                    type: 'action_required',
                    message: 'Objects need to be manually enabled after import',
                    actionPath: '/app/my-app/require-activation',
                  },
                ]
             }
           }
           return {};
         }
       },
    });
  }
}
```

**`remarks`** messages returned in the warnings are user facing and must be translated.

**`remarks`** `importableAndExportable` must be `true` to specify this property.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:423

___

### visibleInManagement

• `Optional` **visibleInManagement**: `boolean`

When set to false, the type will not be listed or searchable in the SO management section.
Main usage of setting this property to false for a type is when objects from the type should
be included in the export via references or export hooks, but should not directly appear in the SOM.
Defaults to `true`.

**`remarks`** `importableAndExportable` must be `true` to specify this property.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:333

## Methods

### getEditUrl

▸ `Optional` **getEditUrl**(`savedObject`): `string`

Function returning the url to use to redirect to the editing page of this object.
If not defined, editing will not be allowed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `savedObject` | [`SavedObject`](client._internal_namespace.SavedObject.md)<`Attributes`\> |

#### Returns

`string`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:352

___

### getInAppUrl

▸ `Optional` **getInAppUrl**(`savedObject`): `Object`

Function returning the url to use to redirect to this object from the management section.
If not defined, redirecting to the object will not be allowed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `savedObject` | [`SavedObject`](client._internal_namespace.SavedObject.md)<`Attributes`\> |

#### Returns

`Object`

an object containing a `path` and `uiCapabilitiesPath` properties. the `path` is the path to
         the object page, relative to the base path. `uiCapabilitiesPath` is the path to check in the
         [uiCapabilities](client._internal_namespace.Capabilities.md) to check if the user has permission to access the object.

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `uiCapabilitiesPath` | `string` |

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:361

___

### getTitle

▸ `Optional` **getTitle**(`savedObject`): `string`

Function returning the title to display in the management table.
If not defined, will use the object's type and id to generate a label.

#### Parameters

| Name | Type |
| :------ | :------ |
| `savedObject` | [`SavedObject`](client._internal_namespace.SavedObject.md)<`Attributes`\> |

#### Returns

`string`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:347

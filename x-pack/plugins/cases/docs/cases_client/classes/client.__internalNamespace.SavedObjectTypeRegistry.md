[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectTypeRegistry

# Class: SavedObjectTypeRegistry

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectTypeRegistry

Registry holding information about all the registered [saved object types](../interfaces/client.__internalNamespace.SavedObjectsType.md).

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.SavedObjectTypeRegistry.md#constructor)

### Properties

- [types](client.__internalNamespace.SavedObjectTypeRegistry.md#types)

### Methods

- [getAllTypes](client.__internalNamespace.SavedObjectTypeRegistry.md#getalltypes)
- [getImportableAndExportableTypes](client.__internalNamespace.SavedObjectTypeRegistry.md#getimportableandexportabletypes)
- [getIndex](client.__internalNamespace.SavedObjectTypeRegistry.md#getindex)
- [getType](client.__internalNamespace.SavedObjectTypeRegistry.md#gettype)
- [getVisibleTypes](client.__internalNamespace.SavedObjectTypeRegistry.md#getvisibletypes)
- [isHidden](client.__internalNamespace.SavedObjectTypeRegistry.md#ishidden)
- [isImportableAndExportable](client.__internalNamespace.SavedObjectTypeRegistry.md#isimportableandexportable)
- [isMultiNamespace](client.__internalNamespace.SavedObjectTypeRegistry.md#ismultinamespace)
- [isNamespaceAgnostic](client.__internalNamespace.SavedObjectTypeRegistry.md#isnamespaceagnostic)
- [isShareable](client.__internalNamespace.SavedObjectTypeRegistry.md#isshareable)
- [isSingleNamespace](client.__internalNamespace.SavedObjectTypeRegistry.md#issinglenamespace)
- [registerType](client.__internalNamespace.SavedObjectTypeRegistry.md#registertype)

## Constructors

### constructor

• **new SavedObjectTypeRegistry**()

## Properties

### types

• `Private` `Readonly` **types**: `any`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:14

## Methods

### getAllTypes

▸ **getAllTypes**(): [`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>[]

Return all [types](../interfaces/client.__internalNamespace.SavedObjectsType.md) currently registered, including the hidden ones.

To only get the visible types (which is the most common use case), use `getVisibleTypes` instead.

#### Returns

[`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>[]

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:35

___

### getImportableAndExportableTypes

▸ **getImportableAndExportableTypes**(): [`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>[]

Return all [types](../interfaces/client.__internalNamespace.SavedObjectsType.md) currently registered that are importable/exportable.

#### Returns

[`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>[]

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:39

___

### getIndex

▸ **getIndex**(`type`): `undefined` \| `string`

Returns the `indexPattern` property for given type, or `undefined` if
the type is not registered.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`undefined` \| `string`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:69

___

### getType

▸ **getType**(`type`): `undefined` \| [`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>

Return the [type](../interfaces/client.__internalNamespace.SavedObjectsType.md) definition for given type name.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`undefined` \| [`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:23

___

### getVisibleTypes

▸ **getVisibleTypes**(): [`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>[]

Returns all visible [types](../interfaces/client.__internalNamespace.SavedObjectsType.md).

A visible type is a type that doesn't explicitly define `hidden=true` during registration.

#### Returns

[`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\>[]

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:29

___

### isHidden

▸ **isHidden**(`type`): `boolean`

Returns the `hidden` property for given type, or `false` if
the type is not registered.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:64

___

### isImportableAndExportable

▸ **isImportableAndExportable**(`type`): `boolean`

Returns the `management.importableAndExportable` property for given type, or
`false` if the type is not registered or does not define a management section.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:74

___

### isMultiNamespace

▸ **isMultiNamespace**(`type`): `boolean`

Returns whether the type is multi-namespace (shareable *or* isolated);
resolves to `false` if the type is not registered

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:54

___

### isNamespaceAgnostic

▸ **isNamespaceAgnostic**(`type`): `boolean`

Returns whether the type is namespace-agnostic (global);
resolves to `false` if the type is not registered

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:44

___

### isShareable

▸ **isShareable**(`type`): `boolean`

Returns whether the type is multi-namespace (shareable);
resolves to `false` if the type is not registered

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:59

___

### isSingleNamespace

▸ **isSingleNamespace**(`type`): `boolean`

Returns whether the type is single-namespace (isolated);
resolves to `true` if the type is not registered

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

`boolean`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:49

___

### registerType

▸ **registerType**(`type`): `void`

Register a [type](../interfaces/client.__internalNamespace.SavedObjectsType.md) inside the registry.
A type can only be registered once. subsequent calls with the same type name will throw an error.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | [`SavedObjectsType`](../interfaces/client.__internalNamespace.SavedObjectsType.md)<`any`\> |

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/saved_objects_type_registry.d.ts:19

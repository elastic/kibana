[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsExportTransformContext

# Interface: SavedObjectsExportTransformContext

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsExportTransformContext

Context passed down to a [export transform function](../modules/client._internal_namespace.md#savedobjectsexporttransform)

## Table of contents

### Properties

- [request](client._internal_namespace.SavedObjectsExportTransformContext.md#request)

## Properties

### request

• **request**: [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

The request that initiated the export request. Can be used to create scoped
services or client inside the [transformation](../modules/client._internal_namespace.md#savedobjectsexporttransform)

#### Defined in

src/core/target/types/server/saved_objects/export/types.d.ts:87

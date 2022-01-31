[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsExportTransformContext

# Interface: SavedObjectsExportTransformContext

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsExportTransformContext

Context passed down to a [export transform function](../modules/client.__internalNamespace.md#savedobjectsexporttransform)

## Table of contents

### Properties

- [request](client.__internalNamespace.SavedObjectsExportTransformContext.md#request)

## Properties

### request

• **request**: [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

The request that initiated the export request. Can be used to create scoped
services or client inside the [transformation](../modules/client.__internalNamespace.md#savedobjectsexporttransform)

#### Defined in

src/core/target/types/server/saved_objects/export/types.d.ts:87

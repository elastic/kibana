[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsValidationMap

# Interface: SavedObjectsValidationMap

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsValidationMap

A map of [validation specs](../modules/client.__internalNamespace.md#savedobjectsvalidationspec) to be used for a given type.
The map's keys must be valid semver versions.

Any time you change the schema of a [SavedObjectsType](client.__internalNamespace.SavedObjectsType.md), you should add a new entry
to this map for the Kibana version the change was introduced in.

**`example`**
```typescript
const validationMap: SavedObjectsValidationMap = {
  '1.0.0': schema.object({
    foo: schema.string(),
  }),
  '2.0.0': schema.object({
    foo: schema.string({
      minLength: 2,
      validate(value) {
        if (!/^[a-z]+$/.test(value)) {
          return 'must be lowercase letters only';
        }
      }
    }),
  }),
}
```

## Indexable

▪ [version: `string`]: [`SavedObjectsValidationSpec`](../modules/client.__internalNamespace.md#savedobjectsvalidationspec)

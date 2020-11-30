# SavedObjectsTagging

Add tagging capability to saved objects

## Integrating tagging on a new object type

In addition to use the UI api to plug the tagging feature in your application, there is a couple
things that needs to be done on the server:

### Add read-access to the `tag` SO type to your feature's capabilities

In order to be able to fetch the tags assigned to an object, the user must have read permission
for the `tag` saved object type. Which is why all features relying on SO tagging must update
their capabilities.

```typescript
features.registerKibanaFeature({
  id: 'myFeature',
  // ...
  privileges: {
    all: {
      // ...
      savedObject: {
        all: ['some-type'],
        read: ['tag'], // <-- HERE
      },
    },
    read: {
      // ...
      savedObject: {
        all: [],
        read: ['some-type', 'tag'], // <-- AND HERE
      },
    },
  },
});
```

### Update the SOT telemetry collector schema to add the new type

The schema is located here: `x-pack/plugins/saved_objects_tagging/server/usage/schema.ts`. You
just need to add the name of the SO type you are adding.

```ts
export const tagUsageCollectorSchema: MakeSchemaFrom<TaggingUsageData> = {
  // ...
  types: {
    dashboard: perTypeSchema,
    visualization: perTypeSchema,
    // <-- add your type here
  },
};
```

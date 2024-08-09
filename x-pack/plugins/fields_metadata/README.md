# Fields Metadata Plugin

The `@kbn/fields-metadata-plugin` is designed to provide a centralized and asynchronous way to consume field metadata across Kibana. This plugin addresses the need for on-demand retrieval of field metadata from static ECS/Metadata definitions and integration manifests, with the flexibility to extend to additional resolution sources in the future.

## Components and Mechanisms

### FieldsMetadataService (Server-side)

The `FieldsMetadataService` is instantiated during the plugin setup/start lifecycle on the server side. It exposes a client that can be used to consume field metadata and provides tools for registering external dependencies.

#### Start Contract

The start contract exposes a `FieldsMetadataClient` instance, which offers the following methods:
- `getByName(name: string, params? {integration: string, dataset?: string})`: Retrieves a single `FieldMetadata` instance by name.

```ts
const timestampField = await client.getByName('@timestamp')
/*
{
  dashed_name: 'timestamp',
  type: 'date',
  ...
}
*/
```

- `find(params?: {fieldNames?: string[], integration?: string, dataset?: string})`: Retrieves a record of matching `FieldMetadata` instances based on the query parameters.

**Parameters**
| Name | Type | Example | Optional |
|---|---|---|---|
| fieldNames | <EcsFieldName \| string>[] | ['@timestamp', 'onepassword.client.platform_version'] | ✅ |
| integration | string | 1password | ✅ |
| dataset | string | 1password.item_usages | ✅ |

```ts
const fields = await client.find({
  fieldNames: ['@timestamp', 'onepassword.client.platform_version'], 
  integration: '1password',
  dataset: '*'
})
/*
{
  '@timestamp': {
    dashed_name: 'timestamp',
    type: 'date',
    ...
  },
  'onepassword.client.platform_version': {
    name: 'platform_version',
    type: 'keyword',
    ...
  },
}
*/
```

> N.B. Passing the `dataset` name parameter to `.find` helps narrowing the scope of the integration assets that need to be fetched, increasing the performance of the request. 
In case the exact dataset for a field is unknown, is it still possible to pass a `*` value as `dataset` parameter to access all the integration datasets' fields. 
Still, is recommended always passing the `dataset` as well if known or unless the required fields come from different datasets of the same integration.

> N.B. In case the `fieldNames` parameter is not passed to `.find`, the result will give the whole list of ECS fields by default. This should be avoided as much as possible, although it helps covering cases where we might need the whole ECS fields list.

#### Source Repositories

The `FieldsMetadataClient` relies on source repositories to fetch field metadata. Currently, there are two repository sources:
- `EcsFieldsRepository`: Fetches static ECS field metadata.
- `IntegrationFieldsRepository`: Fetches fields from an integration package from the Elastic Package Registry (EPR). This requires the `fleet` plugin to be enabled to access the registered fields extractor.

To improve performance, a caching layer is applied to the results retrieved from external sources, minimizing latency and enhancing efficiency.

### Fields Metadata API

A REST API endpoint is exposed to facilitate the retrieval of field metadata:

- `GET /internal/fields_metadata/find`: Supports query parameters to filter and find field metadata, optimizing the payload served to the client.

**Parameters**
| Name | Type | Example | Optional |
|---|---|---|---|
| fieldNames | <EcsFieldName \| string>[] | ['@timestamp', 'onepassword.client.platform_version'] | ✅ |
| attributes | FieldAttribute[] | ['type', 'description', 'name'] | ✅ |
| integration | string | 1password | ✅ |
| dataset | string | 1password.item_usages | ✅ |

### FieldsMetadataService (Client-side)

The client-side counterpart of the `FieldsMetadataService` ensures safe consumption of the exposed API and performs necessary validation steps. The client is returned by the public start contract of the plugin, allowing other parts of Kibana to use fields metadata directly.

With this client request/response validation, error handling and client-side caching are all handled out of the box.

Typical use cases for this client are integrating fields metadata on existing state management solutions or early metadata retrieval on initialization.

```ts
export class FieldsMetadataPlugin implements Plugin {
  ...

  public start(core: CoreStart, plugins) {
    const myFieldsMetadata = plugins.fieldsMetadata.client.find(/* ... */);
    ...
  }
}
```

### useFieldsMetadata (React Hook)

For simpler use cases, the `useFieldsMetadata` React custom hook is provided. This hook is pre-configured with the required dependencies and allows quick access to field metadata client-side. It is essential to retrieve this hook from the start contract of the plugin to ensure proper dependency injection.

**Parameters**
| Name | Type | Example | Optional |
|---|---|---|---|
| fieldNames | <EcsFieldName \| string>[] | ['@timestamp', 'onepassword.client.platform_version'] | ✅ |
| attributes | FieldAttribute[] | ['type', 'description', 'name'] | ✅ |
| integration | string | 1password | ✅ |
| dataset | string | 1password.item_usages | ✅ |

It also accepts a second argument, an array of dependencies to determine when the hook should update the retrieved data.

```ts
const FieldsComponent = () => {
  const {
    fieldsMetadata: { useFieldsMetadata },
  } = useServices(); // Or useKibana and any other utility to get the plugin deps

  const { fieldsMetadata, error, loading } = useFieldsMetadata({ 
    fieldsName: ['@timestamp', 'agent.name'],
    attributes: ['name', 'type']
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {fieldsMetadata.map(field => (
        <div key={field.name}>{field.name}: {field.type}</div>
      ))}
    </div>
  );
};
```

### registerIntegrationFieldsExtractor

To handle the complexity of fetching fields from an integration dataset, the `PackageService.prototype.getPackageFieldsMetadata()` method is implemented. This method maintains the separation of concerns and avoids direct dependency on the fleet plugin. During the fleet plugin setup, a `registerIntegrationFieldsExtractor` service is created to register a callback that retrieves fields by given parameters.

```ts
import { registerIntegrationFieldsExtractor } from '@kbn/fields-metadata-plugin/server';

registerIntegrationFieldsExtractor((params) => {
  // Custom logic to retrieve fields from an integration
  const fields = getFieldsFromIntegration(params);
  return fields;
});
```
```ts
export class FleetPluginServer implements Plugin {
  public setup(core: CoreStart, plugins) {
    plugins.fieldsMetadata.registerIntegrationFieldsExtractor((params) => {
      // Custom logic to retrieve fields from an integration
      const fields = getFieldsFromIntegration(params);
      return fields;
    });
  }
}
```
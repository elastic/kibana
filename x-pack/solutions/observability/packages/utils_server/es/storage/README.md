# Storage adapter

Storage adapters are an abstraction for managing & writing data into Elasticsearch, from Kibana plugins.

There are several ways one can use Elasticsearch in Kibana, for instance:

- a simple id-based CRUD table
- timeseries data with regular indices
- timeseries data with data streams

But then there are many choices to be made that make this a very complex problem:

- Elasticsearch asset managmeent
- Authentication
- Schema changes
- Kibana's distributed nature
- Stateful versus serverless

The intent of storage adapters is to come up with an abstraction that allows Kibana developers to have a common interface for writing to and reading data from Elasticsearch. For instance, for setting up your data store, it should not matter how you authenticate (internal user? current user? API keys?).

## Saved objects

Some of these problems are solved by Saved Objects. But Saved Objects come with a lot of baggage - Kibana RBAC, relationships, spaces, all of which might not be
needed for your use case but are still restrictive. One could consider Saved Objects to be the target of an adapter, but Storage Adapters aim to address a wider set of use-cases.

## Philosophy

Storage adapters should largely adhere to the following principles:

- Interfaces are as close to Elasticsearch as possible. Meaning, the `search` method is practically a pass-through for `_search`.
- Strongly-typed. TypeScript types are inferred from the schema. This makes it easy to create fully-typed clients for any storage.
- Lazy writes. No Elasticsearch assets (templates, indices, aliases) get installed unless necessary. Anything that gets persisted to Elasticsearch raises questions (in SDHs, UIs, APIs) and should be avoided when possible. This also helps avoidable upgrade issues (e.g. conflicting mappings for something that never got used).
- Recoverable. If somehow Elasticsearch assets get borked, the adapters should make a best-effort attempt to recover, or log warnings with clear remediation steps.

## Future goals

Currently, we only have the StorageIndexAdapter which writes to plain indices. In the future, we'll want more:

- A StorageDataStreamAdapter or StorageSavedObjectAdapter
- Federated search
- Data/Index Lifecycle Management
- Migration scripts
- Runtime mappings for older versions

## Usage

### Storage index adapter

To use the storage index adapter, instantiate it with an authenticated Elasticsearch client:

```ts
  const storageSettings = {
    name: '.kibana_streams_assets',
    schema: {
      properties: {
        [ASSET_ASSET_ID]: types.keyword({ required: true }),
        [ASSET_TYPE]: types.enum(Object.values(ASSET_TYPES), { required: true }),
      },
    },
  } satisfies IndexStorageSettings;

  // create and configure the adapter
  const adapter = new StorageIndexAdapter(
    esClient: coreStart.elasticsearch.client.asInternalUser,
    this.logger.get('assets'),
    storageSettings
  );

  // get the client (its interface is shared across all adapters)
  const client = adapter.getClient();

  const response = await client.search('operation_name', {
    track_total_hits: true
  });

```

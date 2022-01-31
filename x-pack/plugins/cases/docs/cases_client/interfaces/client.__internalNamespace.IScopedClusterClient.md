[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / IScopedClusterClient

# Interface: IScopedClusterClient

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).IScopedClusterClient

Serves the same purpose as the normal {@link IClusterClient | cluster client} but exposes
an additional `asCurrentUser` method that doesn't use credentials of the Kibana internal
user (as `asInternalUser` does) to request Elasticsearch API, but rather passes HTTP headers
extracted from the current user request to the API instead.

## Table of contents

### Properties

- [asCurrentUser](client.__internalNamespace.IScopedClusterClient.md#ascurrentuser)
- [asInternalUser](client.__internalNamespace.IScopedClusterClient.md#asinternaluser)

## Properties

### asCurrentUser

• `Readonly` **asCurrentUser**: [`ElasticsearchClient`](../modules/client.__internalNamespace.md#elasticsearchclient)

A [client](../modules/client.__internalNamespace.md#elasticsearchclient) to be used to query the elasticsearch cluster
on behalf of the user that initiated the request to the Kibana server.

#### Defined in

src/core/target/types/server/elasticsearch/client/scoped_cluster_client.d.ts:20

___

### asInternalUser

• `Readonly` **asInternalUser**: [`ElasticsearchClient`](../modules/client.__internalNamespace.md#elasticsearchclient)

A [client](../modules/client.__internalNamespace.md#elasticsearchclient) to be used to query the elasticsearch cluster
on behalf of the internal Kibana user.

#### Defined in

src/core/target/types/server/elasticsearch/client/scoped_cluster_client.d.ts:15

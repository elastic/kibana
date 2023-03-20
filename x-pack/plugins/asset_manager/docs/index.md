# Asset Manager Documentation

_Note:_ To read about development guidance around testing, sample data, etc., see the
[plugin's main README file](../README.md)

## Alpha Configuration

This plugin is NOT fully enabled by default, even though it's always enabled
by Kibana's definition of "enabled". However, without the following configuration,
it will bail before it sets up any routes or returns anything from its
start, setup, or stop hooks.

To fully enable the plugin, set the following config value in your kibana.yml file:

```yaml
xpack.assetManager.alphaEnabled: true
```

## APIs

This plugin provides the following APIs.

### Shared Types

The following types are used in the API docs described below.

```ts
type ISOString = string; // ISO date time string
type DateMathString = string; // see https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math
type RangeDate = ISOString | DateMathString;
type AssetType = 'k8s.pod' | 'k8s.cluster' | 'k8s.node'; // etc.
type AssetEan = string; // of format "{AssetType}:{id string}", e.g. "k8s.pod:my-pod-id-123xyz"
type ESQueryString = string; // Lucene query string, encoded

interface Asset extends ECSDocument {
  lastSeen: Date;
  'asset.type': AssetType;
  'asset.id': string;
  'asset.name'?: string;
  'asset.ean': AssetEan;
  'asset.parents'?: AssetEan[];
  'asset.children'?: AssetEan[];
  'asset.references'?: AssetEan[];
  distance?: number; // used when assets are returned via relationship to another asset
}
```

### REST API

The following REST endpoints are available at the base URL of `{kibana_url}:{port}/{base_path}/api/asset-manager`

**Note: Unless otherwise specified, query parameters that accept an _array_ type of values do so by specifying the
query parameter key multiple times, e.g. `?type=k8s.pod&type=k8s.node`**

#### GET /assets

Returns a list of assets present within a given time range. Can be limited by asset type OR EAN.

##### Request

| Option  | Type          | Required? | Default | Description                                                                        |
| :------ | :------------ | :-------- | :------ | :--------------------------------------------------------------------------------- |
| from    | RangeDate     | Yes       | N/A     | Starting point for date range to search for assets within                          |
| to      | RangeDate     | No        | "now"   | End point for date range to search for assets                                      |
| type    | AssetType[]   | No        | all     | Specify one or more types to restrict the query                                    |
| ean\*   | AssetEan[]    | No        | all     | Specify one or more EANs (specific assets) to restrict the query                   |
| query\* | ESQueryString | No        | n/a     | Include a Lucene query string to be applied, for more general ECS-based filtering. |

\*query options not implemented yet

_Note: Cannot specify both `type` and `ean` at the same time. Also, specifying the `query` param can lead to surprising results if it overlaps with the other parameters._

##### Responses

<details>

<summary>All assets JSON response</summary>

```curl
GET /assets?from=2022-02-07T00:00:00.000Z&to=2022-02-07T16:00:00.000Z

{
  "results": [
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.cluster",
      "asset.id": "my-cluster-1",
      "asset.name": "my-cluster-1",
      "asset.ean": "k8s.cluster:my-cluster-1",
      "asset.parents": [],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.node",
      "asset.id": "kn101",
      "asset.name": "node-101",
      "asset.ean": "k8s.node:node-101",
      "asset.parents": ["k8s.cluster:my-cluster-1"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.node",
      "asset.id": "kn102",
      "asset.name": "node-102",
      "asset.ean": "k8s.node:node-102",
      "asset.parents": ["k8s.cluster:my-cluster-1"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp2040",
      "asset.name": "pod-2q5m",
      "asset.ean": "k8s.pod:pod-2q5m",
      "asset.parents": ["k8s.node:node-101"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp2055",
      "asset.name": "pod-6r1z",
      "asset.ean": "k8s.pod:pod-6r1z",
      "asset.parents": ["k8s.node:node-101"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp3987",
      "asset.name": "pod-9e2w",
      "asset.ean": "k8s.pod:pod-9e2w",
      "asset.parents": ["k8s.node:node-102"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp3987",
      "asset.name": "pod-9e2w",
      "asset.ean": "k8s.pod:pod-9e2w",
      "asset.parents": ["k8s.node:node-102"],
      "asset.children": [],
      "asset.references": []
    }
  ]
}
```

</details>

<details>

<summary>Assets by type JSON response</summary>

```curl
GET /assets?from=2022-02-07T00:00:00.000Z&to=2022-02-07T16:00:00.000Z&types=k8s.pod

{
  "results": [
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp2040",
      "asset.name": "pod-2q5m",
      "asset.ean": "k8s.pod:pod-2q5m",
      "asset.parents": ["k8s.node:node-101"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp2055",
      "asset.name": "pod-6r1z",
      "asset.ean": "k8s.pod:pod-6r1z",
      "asset.parents": ["k8s.node:node-101"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp3987",
      "asset.name": "pod-9e2w",
      "asset.ean": "k8s.pod:pod-9e2w",
      "asset.parents": ["k8s.node:node-102"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp3987",
      "asset.name": "pod-9e2w",
      "asset.ean": "k8s.pod:pod-9e2w",
      "asset.parents": ["k8s.node:node-102"],
      "asset.children": [],
      "asset.references": []
    }
  ]
}
```

</details>

<details>

<summary>Assets by EAN JSON response</summary>

```curl
GET /assets?from=2022-02-07T00:00:00.000Z&to=2022-02-07T16:00:00.000Z&eans=k8s.node:node-101,k8s.pod:pod-6r1z

{
  "results": [
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.node",
      "asset.id": "kn101",
      "asset.name": "node-101",
      "asset.ean": "k8s.node:node-101",
      "asset.parents": ["k8s.cluster:my-cluster-1"],
      "asset.children": [],
      "asset.references": []
    },
    {
      "@timestamp": "2022-02-07T14:04:40.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "kp2055",
      "asset.name": "pod-6r1z",
      "asset.ean": "k8s.pod:pod-6r1z",
      "asset.parents": ["k8s.node:node-101"],
      "asset.children": [],
      "asset.references": []
    }
  ]
}
```

</details>

<a name="sample-data" id="sample-data"></a>

#### GET /assets/sample

Returns the list of pre-defined sample asset documents that would be indexed
when using the associated POST request.

#### POST /assets/sample

Indexes a batch of the pre-defined sample documents (which can be inspected before
index by using the associated GET request).

##### Request

| Option       | Type       | Required? | Default | Description                                                 |
| :----------- | :--------- | :-------- | :------ | :---------------------------------------------------------- |
| baseDateTime | RangeDate  | No        | "now"   | Used as the timestamp for each asset document in this batch |
| exludeEans   | AssetEan[] | No        | []      | List of string EAN values to exclude from this batch        |

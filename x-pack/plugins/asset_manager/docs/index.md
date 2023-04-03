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

Returns a list of assets present within a given time range. Can be limited by asset type OR EAN (Elastic Asset Name).

##### Request

| Option  | Type          | Required? | Default | Description                                                                        |
| :------ | :------------ | :-------- | :------ | :--------------------------------------------------------------------------------- |
| from    | RangeDate     | No       | "now-24h"     | Starting point for date range to search for assets within                          |
| to      | RangeDate     | No        | "now"   | End point for date range to search for assets                                      |
| type    | AssetType[]   | No        | all     | Specify one or more types to restrict the query                                    |
| ean     | AssetEan[]    | No        | all     | Specify one or more EANs (specific assets) to restrict the query                   |
| size     | number    | No        | all     | Limit the amount of assets returned                  |


_Notes:_
- User cannot specify both type and ean at the same time.
- For array types such as `type` and `ean`, user should specify the query parameter multiple times, e.g. `type=k8s.pod&type=k8s.node`

##### Responses

<details>

<summary>Invalid request with type and ean both specified</summary>

```curl
GET /assets?from=2023-03-25T17:44:44.000Z&type=k8s.pod&ean=k8s.pod:123

{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Filters "type" and "ean" are mutually exclusive but found both."
}
```

</details>

<details>

<summary>All assets JSON response</summary>

```curl
GET /assets?from=2023-03-25T17:44:44.000Z&to=2023-03-25T18:44:44.000Z

{
  "results": [
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.cluster",
      "asset.id": "cluster-001",
      "asset.name": "Cluster 001 (AWS EKS)",
      "asset.ean": "k8s.cluster:cluster-001",
      "orchestrator.type": "kubernetes",
      "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
      "orchestrator.cluster.id": "cluster-001",
      "cloud.provider": "aws",
      "cloud.region": "us-east-1",
      "cloud.service.name": "eks"
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.cluster",
      "asset.id": "cluster-002",
      "asset.name": "Cluster 002 (Azure AKS)",
      "asset.ean": "k8s.cluster:cluster-002",
      "orchestrator.type": "kubernetes",
      "orchestrator.cluster.name": "Cluster 002 (Azure AKS)",
      "orchestrator.cluster.id": "cluster-002",
      "cloud.provider": "azure",
      "cloud.region": "eu-west",
      "cloud.service.name": "aks"
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.node",
      "asset.id": "node-101",
      "asset.name": "k8s-node-101-aws",
      "asset.ean": "k8s.node:node-101",
      "asset.parents": [
        "k8s.cluster:cluster-001"
      ],
      "orchestrator.type": "kubernetes",
      "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
      "orchestrator.cluster.id": "cluster-001",
      "cloud.provider": "aws",
      "cloud.region": "us-east-1",
      "cloud.service.name": "eks"
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.node",
      "asset.id": "node-102",
      "asset.name": "k8s-node-102-aws",
      "asset.ean": "k8s.node:node-102",
      "asset.parents": [
        "k8s.cluster:cluster-001"
      ],
      "orchestrator.type": "kubernetes",
      "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
      "orchestrator.cluster.id": "cluster-001",
      "cloud.provider": "aws",
      "cloud.region": "us-east-1",
      "cloud.service.name": "eks"
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.node",
      "asset.id": "node-103",
      "asset.name": "k8s-node-103-aws",
      "asset.ean": "k8s.node:node-103",
      "asset.parents": [
        "k8s.cluster:cluster-001"
      ],
      "orchestrator.type": "kubernetes",
      "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
      "orchestrator.cluster.id": "cluster-001",
      "cloud.provider": "aws",
      "cloud.region": "us-east-1",
      "cloud.service.name": "eks"
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200xrg1",
      "asset.name": "k8s-pod-200xrg1-aws",
      "asset.ean": "k8s.pod:pod-200xrg1",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200dfp2",
      "asset.name": "k8s-pod-200dfp2-aws",
      "asset.ean": "k8s.pod:pod-200dfp2",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wwc3",
      "asset.name": "k8s-pod-200wwc3-aws",
      "asset.ean": "k8s.pod:pod-200wwc3",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200naq4",
      "asset.name": "k8s-pod-200naq4-aws",
      "asset.ean": "k8s.pod:pod-200naq4",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ohr5",
      "asset.name": "k8s-pod-200ohr5-aws",
      "asset.ean": "k8s.pod:pod-200ohr5",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200yyx6",
      "asset.name": "k8s-pod-200yyx6-aws",
      "asset.ean": "k8s.pod:pod-200yyx6",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200psd7",
      "asset.name": "k8s-pod-200psd7-aws",
      "asset.ean": "k8s.pod:pod-200psd7",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wmc8",
      "asset.name": "k8s-pod-200wmc8-aws",
      "asset.ean": "k8s.pod:pod-200wmc8",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ugg9",
      "asset.name": "k8s-pod-200ugg9-aws",
      "asset.ean": "k8s.pod:pod-200ugg9",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    }
  ]
}
```

</details>

<details>

<summary>Assets by type JSON response</summary>

```curl
GET /assets?from=2023-03-25T17:44:44.000Z&to=2023-03-25T18:44:44.000Z&type=k8s.pod

{
  "results": [
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200xrg1",
      "asset.name": "k8s-pod-200xrg1-aws",
      "asset.ean": "k8s.pod:pod-200xrg1",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200dfp2",
      "asset.name": "k8s-pod-200dfp2-aws",
      "asset.ean": "k8s.pod:pod-200dfp2",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wwc3",
      "asset.name": "k8s-pod-200wwc3-aws",
      "asset.ean": "k8s.pod:pod-200wwc3",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200naq4",
      "asset.name": "k8s-pod-200naq4-aws",
      "asset.ean": "k8s.pod:pod-200naq4",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ohr5",
      "asset.name": "k8s-pod-200ohr5-aws",
      "asset.ean": "k8s.pod:pod-200ohr5",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200yyx6",
      "asset.name": "k8s-pod-200yyx6-aws",
      "asset.ean": "k8s.pod:pod-200yyx6",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200psd7",
      "asset.name": "k8s-pod-200psd7-aws",
      "asset.ean": "k8s.pod:pod-200psd7",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wmc8",
      "asset.name": "k8s-pod-200wmc8-aws",
      "asset.ean": "k8s.pod:pod-200wmc8",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ugg9",
      "asset.name": "k8s-pod-200ugg9-aws",
      "asset.ean": "k8s.pod:pod-200ugg9",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    }
  ]
}
```

</details>

<details>

<summary>Assets by EAN JSON response</summary>

```curl
GET /assets?from=2023-03-25T17:44:44.000Z&to=2023-03-25T18:44:44.000Z&ean=k8s.node:node-101&ean=k8s.pod:pod-6r1z

{
  "results": [
    {
      "@timestamp": "2023-03-25T18:35:38.369Z",
      "asset.type": "k8s.node",
      "asset.id": "node-101",
      "asset.name": "k8s-node-101-aws",
      "asset.ean": "k8s.node:node-101",
      "asset.parents": [
        "k8s.cluster:cluster-001"
      ],
      "orchestrator.type": "kubernetes",
      "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
      "orchestrator.cluster.id": "cluster-001",
      "cloud.provider": "aws",
      "cloud.region": "us-east-1",
      "cloud.service.name": "eks"
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

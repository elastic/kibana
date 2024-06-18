## Deprecated REST API docs

These docs are not being currently maintained because they pertain to an internal REST API. Please see [our docs for our API clients](./api.md) instead.

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

| Option | Type        | Required? | Default   | Description                                                      |
| :----- | :---------- | :-------- | :-------- | :--------------------------------------------------------------- |
| from   | RangeDate   | No        | "now-24h" | Starting point for date range to search for assets within        |
| to     | RangeDate   | No        | "now"     | End point for date range to search for assets                    |
| type   | AssetType[] | No        | all       | Specify one or more types to restrict the query                  |
| ean    | AssetEan[]  | No        | all       | Specify one or more EANs (specific assets) to restrict the query |
| size   | number      | No        | all       | Limit the amount of assets returned                              |

_Notes:_

- User cannot specify both type and ean at the same time.
- For array types such as `type` and `ean`, user should specify the query parameter multiple times, e.g. `type=k8s.pod&type=k8s.node`

##### Responses

<details>

<summary>Invalid request with type and ean both specified</summary>

```curl
GET kbn:/api/asset-manager/assets?from=2023-03-25T17:44:44.000Z&type=k8s.pod&ean=k8s.pod:123

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
GET kbn:/api/asset-manager/assets?from=2023-03-25T17:44:44.000Z&to=2023-03-25T18:44:44.000Z

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
GET kbn:/api/asset-manager/assets?from=2023-03-25T17:44:44.000Z&to=2023-03-25T18:44:44.000Z&type=k8s.pod

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
GET kbn:/api/asset-manager/assets?from=2023-03-25T17:44:44.000Z&to=2023-03-25T18:44:44.000Z&ean=k8s.node:node-101&ean=k8s.pod:pod-6r1z

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

### GET /assets/diff

Returns assets found in the two time ranges, split by what occurs in only either or in both.

#### Request

| Option | Type        | Required? | Default | Description                                                        |
| :----- | :---------- | :-------- | :------ | :----------------------------------------------------------------- |
| aFrom  | RangeDate   | Yes       | N/A     | Starting point for baseline date range to search for assets within |
| aTo    | RangeDate   | Yes       | N/A     | End point for baseline date range to search for assets within      |
| bFrom  | RangeDate   | Yes       | N/A     | Starting point for comparison date range                           |
| bTo    | RangeDate   | Yes       | N/A     | End point for comparison date range                                |
| type   | AssetType[] | No        | all     | Restrict results to one or more asset.type value                   |

#### Responses

<details>

<summary>Request where comparison range is missing assets that are found in the baseline range</summary>

```curl
GET kbn:/api/asset-manager/assets/diff?aFrom=2022-02-07T00:00:00.000Z&aTo=2022-02-07T01:30:00.000Z&bFrom=2022-02-07T01:00:00.000Z&bTo=2022-02-07T02:00:00.000Z

{
  "onlyInA": [
    {
      "@timestamp": "2022-02-07T00:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200xrg1",
      "asset.name": "k8s-pod-200xrg1-aws",
      "asset.ean": "k8s.pod:pod-200xrg1",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2022-02-07T00:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200dfp2",
      "asset.name": "k8s-pod-200dfp2-aws",
      "asset.ean": "k8s.pod:pod-200dfp2",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    }
  ],
  "onlyInB": [],
  "inBoth": [
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ohr5",
      "asset.name": "k8s-pod-200ohr5-aws",
      "asset.ean": "k8s.pod:pod-200ohr5",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200yyx6",
      "asset.name": "k8s-pod-200yyx6-aws",
      "asset.ean": "k8s.pod:pod-200yyx6",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200psd7",
      "asset.name": "k8s-pod-200psd7-aws",
      "asset.ean": "k8s.pod:pod-200psd7",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wmc8",
      "asset.name": "k8s-pod-200wmc8-aws",
      "asset.ean": "k8s.pod:pod-200wmc8",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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

<summary>Request where baseline range is missing assets that are found in the comparison range</summary>

```curl
GET kbn:/api/asset-manager/assets/diff?aFrom=2022-02-07T01:00:00.000Z&aTo=2022-02-07T01:30:00.000Z&bFrom=2022-02-07T01:00:00.000Z&bTo=2022-02-07T03:00:00.000Z

{
  "onlyInA": [],
  "onlyInB": [
    {
      "@timestamp": "2022-02-07T03:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wwc3",
      "asset.name": "k8s-pod-200wwc3-aws",
      "asset.ean": "k8s.pod:pod-200wwc3",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2022-02-07T03:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200naq4",
      "asset.name": "k8s-pod-200naq4-aws",
      "asset.ean": "k8s.pod:pod-200naq4",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    }
  ],
  "inBoth": [
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ohr5",
      "asset.name": "k8s-pod-200ohr5-aws",
      "asset.ean": "k8s.pod:pod-200ohr5",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200yyx6",
      "asset.name": "k8s-pod-200yyx6-aws",
      "asset.ean": "k8s.pod:pod-200yyx6",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200psd7",
      "asset.name": "k8s-pod-200psd7-aws",
      "asset.ean": "k8s.pod:pod-200psd7",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wmc8",
      "asset.name": "k8s-pod-200wmc8-aws",
      "asset.ean": "k8s.pod:pod-200wmc8",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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

<summary>Request where each range is missing assets found in the other range</summary>

```curl
GET kbn:/api/asset-manager/assets/diff?aFrom=2022-02-07T00:00:00.000Z&aTo=2022-02-07T01:30:00.000Z&bFrom=2022-02-07T01:00:00.000Z&bTo=2022-02-07T03:00:00.000Z

{
  "onlyInA": [
    {
      "@timestamp": "2022-02-07T00:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200xrg1",
      "asset.name": "k8s-pod-200xrg1-aws",
      "asset.ean": "k8s.pod:pod-200xrg1",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2022-02-07T00:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200dfp2",
      "asset.name": "k8s-pod-200dfp2-aws",
      "asset.ean": "k8s.pod:pod-200dfp2",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    }
  ],
  "onlyInB": [
    {
      "@timestamp": "2022-02-07T03:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wwc3",
      "asset.name": "k8s-pod-200wwc3-aws",
      "asset.ean": "k8s.pod:pod-200wwc3",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2022-02-07T03:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200naq4",
      "asset.name": "k8s-pod-200naq4-aws",
      "asset.ean": "k8s.pod:pod-200naq4",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    }
  ],
  "inBoth": [
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
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
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ohr5",
      "asset.name": "k8s-pod-200ohr5-aws",
      "asset.ean": "k8s.pod:pod-200ohr5",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200yyx6",
      "asset.name": "k8s-pod-200yyx6-aws",
      "asset.ean": "k8s.pod:pod-200yyx6",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200psd7",
      "asset.name": "k8s-pod-200psd7-aws",
      "asset.ean": "k8s.pod:pod-200psd7",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wmc8",
      "asset.name": "k8s-pod-200wmc8-aws",
      "asset.ean": "k8s.pod:pod-200wmc8",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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

<summary>Request where each range is missing assets found in the other range, but restricted by type</summary>

```curl
GET kbn:/api/asset-manager/assets/diff?aFrom=2022-02-07T00:00:00.000Z&aTo=2022-02-07T01:30:00.000Z&bFrom=2022-02-07T01:00:00.000Z&bTo=2022-02-07T03:00:00.000Z&type=k8s.pod

{
  "onlyInA": [
    {
      "@timestamp": "2022-02-07T00:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200xrg1",
      "asset.name": "k8s-pod-200xrg1-aws",
      "asset.ean": "k8s.pod:pod-200xrg1",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2022-02-07T00:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200dfp2",
      "asset.name": "k8s-pod-200dfp2-aws",
      "asset.ean": "k8s.pod:pod-200dfp2",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    }
  ],
  "onlyInB": [
    {
      "@timestamp": "2022-02-07T03:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wwc3",
      "asset.name": "k8s-pod-200wwc3-aws",
      "asset.ean": "k8s.pod:pod-200wwc3",
      "asset.parents": [
        "k8s.node:node-101"
      ]
    },
    {
      "@timestamp": "2022-02-07T03:00:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200naq4",
      "asset.name": "k8s-pod-200naq4-aws",
      "asset.ean": "k8s.pod:pod-200naq4",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    }
  ],
  "inBoth": [
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200ohr5",
      "asset.name": "k8s-pod-200ohr5-aws",
      "asset.ean": "k8s.pod:pod-200ohr5",
      "asset.parents": [
        "k8s.node:node-102"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200yyx6",
      "asset.name": "k8s-pod-200yyx6-aws",
      "asset.ean": "k8s.pod:pod-200yyx6",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200psd7",
      "asset.name": "k8s-pod-200psd7-aws",
      "asset.ean": "k8s.pod:pod-200psd7",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
      "asset.type": "k8s.pod",
      "asset.id": "pod-200wmc8",
      "asset.name": "k8s-pod-200wmc8-aws",
      "asset.ean": "k8s.pod:pod-200wmc8",
      "asset.parents": [
        "k8s.node:node-103"
      ]
    },
    {
      "@timestamp": "2022-02-07T01:30:00.000Z",
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

#### GET /assets/related

Returns assets related to the provided ean. The relation can be one of ancestors, descendants or references.

#### Request

| Option      | Type         | Required? | Default | Description                                                                                       |
| :---------- | :----------- | :-------- | :------ | :------------------------------------------------------------------------------------------------ | ----------- | ----------- |
| relation    | string       | Yes       | N/A     | The type of related assets we're looking for. One of (ancestors                                   | descendants | references) |
| from        | RangeDate    | Yes       | N/A     | Starting point for date range to search for assets within                                         |
| to          | RangeDate    | No        | "now"   | End point for date range to search for assets                                                     |
| ean         | AssetEan     | Yes       | N/A     | Single Elastic Asset Name representing the asset for which the related assets are being requested |
| type        | AssetType[]  | No        | all     | Restrict results to one or more asset.type value                                                  |
| maxDistance | number (1-5) | No        | 1       | Maximum number of "hops" to search away from specified asset                                      |

#### Responses

<details>

<summary>Request looking for ancestors</summary>

```curl
GET kbn:/api/asset-manager/assets/related?ean=k8s.node:node-101&relation=ancestors&maxDistance=1&from=2023-04-18T13:10:13.111Z&to=2023-04-18T15:10:13.111Z
{
    "results": {
        "primary": {
            "@timestamp": "2023-04-18T14:10:13.111Z",
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
        "ancestors": [
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.cluster",
                "asset.id": "cluster-001",
                "asset.name": "Cluster 001 (AWS EKS)",
                "asset.ean": "k8s.cluster:cluster-001",
                "orchestrator.type": "kubernetes",
                "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
                "orchestrator.cluster.id": "cluster-001",
                "cloud.provider": "aws",
                "cloud.region": "us-east-1",
                "cloud.service.name": "eks",
                "distance": 1
            }
        ]
    }
}
```

</details>

<details>

<summary>Request looking for descendants</summary>

```curl
GET kbn:/api/asset-manager/assets/related?ean=k8s.cluster:cluster-001&relation=descendants&maxDistance=1&from=2023-04-18T13:10:13.111Z&to=2023-04-18T15:10:13.111Z

{
    "results": {
        "primary": {
            "@timestamp": "2023-04-18T14:10:13.111Z",
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
        "descendants": [
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
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
                "cloud.service.name": "eks",
                "distance": 1
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
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
                "cloud.service.name": "eks",
                "distance": 1
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
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
                "cloud.service.name": "eks",
                "distance": 1
            }
        ]
    }
}
```

</details>

<details>

<summary>Request looking for references</summary>

```curl
GET kbn:/api/asset-manager/assets/related?ean=k8s.pod:pod-200xrg1&relation=references&maxDistance=1&from=2023-04-18T13:10:13.111Z&to=2023-04-18T15:10:13.111Z

{
    "results": {
        "primary": {
            "@timestamp": "2023-04-18T14:10:13.111Z",
            "asset.type": "k8s.pod",
            "asset.id": "pod-200xrg1",
            "asset.name": "k8s-pod-200xrg1-aws",
            "asset.ean": "k8s.pod:pod-200xrg1",
            "asset.parents": [
                "k8s.node:node-101"
            ],
            "asset.references": [
                "k8s.cluster:cluster-001"
            ]
        },
        "references": [
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.cluster",
                "asset.id": "cluster-001",
                "asset.name": "Cluster 001 (AWS EKS)",
                "asset.ean": "k8s.cluster:cluster-001",
                "orchestrator.type": "kubernetes",
                "orchestrator.cluster.name": "Cluster 001 (AWS EKS)",
                "orchestrator.cluster.id": "cluster-001",
                "cloud.provider": "aws",
                "cloud.region": "us-east-1",
                "cloud.service.name": "eks",
                "distance": 1
            }
        ]
    }
}
```

</details>

<details>

<summary>Request with type filter and non-default maxDistance</summary>

```curl
GET kbn:/api/asset-manager/assets/related?ean=k8s.cluster:cluster-001&relation=descendants&maxDistance=2&from=2023-04-18T13:10:13.111Z&to=2023-04-18T15:10:13.111Z&type=k8s.pod

{
    "results": {
        "primary": {
            "@timestamp": "2023-04-18T14:10:13.111Z",
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
        "descendants": [
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200xrg1",
                "asset.name": "k8s-pod-200xrg1-aws",
                "asset.ean": "k8s.pod:pod-200xrg1",
                "asset.parents": [
                    "k8s.node:node-101"
                ],
                "asset.references": [
                    "k8s.cluster:cluster-001"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200dfp2",
                "asset.name": "k8s-pod-200dfp2-aws",
                "asset.ean": "k8s.pod:pod-200dfp2",
                "asset.parents": [
                    "k8s.node:node-101"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200wwc3",
                "asset.name": "k8s-pod-200wwc3-aws",
                "asset.ean": "k8s.pod:pod-200wwc3",
                "asset.parents": [
                    "k8s.node:node-101"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200naq4",
                "asset.name": "k8s-pod-200naq4-aws",
                "asset.ean": "k8s.pod:pod-200naq4",
                "asset.parents": [
                    "k8s.node:node-102"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200ohr5",
                "asset.name": "k8s-pod-200ohr5-aws",
                "asset.ean": "k8s.pod:pod-200ohr5",
                "asset.parents": [
                    "k8s.node:node-102"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200yyx6",
                "asset.name": "k8s-pod-200yyx6-aws",
                "asset.ean": "k8s.pod:pod-200yyx6",
                "asset.parents": [
                    "k8s.node:node-103"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200psd7",
                "asset.name": "k8s-pod-200psd7-aws",
                "asset.ean": "k8s.pod:pod-200psd7",
                "asset.parents": [
                    "k8s.node:node-103"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200wmc8",
                "asset.name": "k8s-pod-200wmc8-aws",
                "asset.ean": "k8s.pod:pod-200wmc8",
                "asset.parents": [
                    "k8s.node:node-103"
                ],
                "distance": 2
            },
            {
                "@timestamp": "2023-04-18T14:10:13.111Z",
                "asset.type": "k8s.pod",
                "asset.id": "pod-200ugg9",
                "asset.name": "k8s-pod-200ugg9-aws",
                "asset.ean": "k8s.pod:pod-200ugg9",
                "asset.parents": [
                    "k8s.node:node-103"
                ],
                "distance": 2
            }
        ]
    }
}
```

</details>

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

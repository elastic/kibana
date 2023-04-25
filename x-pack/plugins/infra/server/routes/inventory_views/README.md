# Inventory Views CRUD api

## Find all: `GET /api/infra/inventory_views`

Retrieves all inventory views in a reduced version.

### Request

- **Method**: GET
- **Path**: /api/infra/inventory_views
- **Query params**:
  - `sourceId` _(optional)_: Specify a source id related to the inventory views. Default value: `default`.

### Response

```json
GET /api/infra/inventory_views

Status code: 200

{
  "data": [
    {
      "id": "static",
      "attributes": {
        "name": "Default view",
        "isDefault": false,
        "isStatic": true
      }
    },
    {
      "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
      "version": "WzQwMiwxXQ==",
      "updatedAt": 1681398305034,
      "attributes": {
        "name": "Ad-hoc",
        "isDefault": true,
        "isStatic": false
      }
    },
    {
      "id": "c301ef20-da0c-11ed-aac0-77131228e6f1",
      "version": "WzQxMCwxXQ==",
      "updatedAt": 1681398386450,
      "attributes": {
        "name": "Custom",
        "isDefault": false,
        "isStatic": false
      }
    }
  ]
}
```

## Get one: `GET /api/infra/inventory_views/{inventoryViewId}`

Retrieves a single inventory view by ID

### Request

- **Method**: GET
- **Path**: /api/infra/inventory_views/{inventoryViewId}
- **Query params**:
  - `sourceId` _(optional)_: Specify a source id related to the inventory view. Default value: `default`.

### Response

```json
GET /api/infra/inventory_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 200

{
  "data": {
    "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
    "version": "WzQwMiwxXQ==",
    "updatedAt": 1681398305034,
    "attributes": {
      "name": "Ad-hoc",
      "isDefault": true,
      "isStatic": false,
      "metric": {
        "type": "cpu"
      },
      "sort": {
        "by": "name",
        "direction": "desc"
      },
      "groupBy": [],
      "nodeType": "host",
      "view": "map",
      "customOptions": [],
      "customMetrics": [],
      "boundsOverride": {
        "max": 1,
        "min": 0
      },
      "autoBounds": true,
      "accountId": "",
      "region": "",
      "autoReload": false,
      "filterQuery": {
        "expression": "",
        "kind": "kuery"
      },
      "legend": {
        "palette": "cool",
        "reverseColors": false,
        "steps": 10
      },
      "timelineOpen": false
    }
  }
}
```

```json
GET /api/infra/inventory_views/random-id

Status code: 404

{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Saved object [inventory-view/random-id] not found"
}
```

## Create one: `POST /api/infra/inventory_views`

Creates a new inventory view.

### Request

- **Method**: POST
- **Path**: /api/infra/inventory_views
- **Request body**:
  ```json
  {
    "attributes": {
      "name": "View name",
      "metric": {
        "type": "cpu"
      },
      "sort": {
        "by": "name",
        "direction": "desc"
      },
      //...
    }
  }
  ```

### Response

```json
POST /api/infra/inventory_views

Status code: 201

{
  "data": {
    "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
    "version": "WzQwMiwxXQ==",
    "updatedAt": 1681398305034,
    "attributes": {
      "name": "View name",
      "isDefault": false,
      "isStatic": false,
      "metric": {
        "type": "cpu"
      },
      "sort": {
        "by": "name",
        "direction": "desc"
      },
      "groupBy": [],
      "nodeType": "host",
      "view": "map",
      "customOptions": [],
      "customMetrics": [],
      "boundsOverride": {
        "max": 1,
        "min": 0
      },
      "autoBounds": true,
      "accountId": "",
      "region": "",
      "autoReload": false,
      "filterQuery": {
        "expression": "",
        "kind": "kuery"
      },
      "legend": {
        "palette": "cool",
        "reverseColors": false,
        "steps": 10
      },
      "timelineOpen": false
    }
  }
}
```

Send in the payload a `name` attribute already held by another view:
```json
POST /api/infra/inventory_views

Status code: 409

{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A view with that name already exists."
}
```

## Update one: `PUT /api/infra/inventory_views/{inventoryViewId}`

Updates an inventory view.

Any attribute can be updated except for `isDefault` and `isStatic`, which are derived by the source configuration preference set by the user.

Any attempt to update the static view with id `0` will return a `400 The inventory view with id 0 is not configurable.`

### Request

- **Method**: PUT
- **Path**: /api/infra/inventory_views/{inventoryViewId}
- **Query params**:
  - `sourceId` _(optional)_: Specify a source id related to the inventory view. Default value: `default`.
- **Request body**:
  ```json
  {
    "attributes": {
      "name": "View name",
      "metric": {
        "type": "cpu"
      },
      "sort": {
        "by": "name",
        "direction": "desc"
      },
      //...
    }
  }
  ```

### Response

```json
PUT /api/infra/inventory_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 200

{
  "data": {
    "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
    "version": "WzQwMiwxXQ==",
    "updatedAt": 1681398305034,
    "attributes": {
      "name": "View name",
      "isDefault": false,
      "isStatic": false,
      "metric": {
        "type": "cpu"
      },
      "sort": {
        "by": "name",
        "direction": "desc"
      },
      "groupBy": [],
      "nodeType": "host",
      "view": "map",
      "customOptions": [],
      "customMetrics": [],
      "boundsOverride": {
        "max": 1,
        "min": 0
      },
      "autoBounds": true,
      "accountId": "",
      "region": "",
      "autoReload": false,
      "filterQuery": {
        "expression": "",
        "kind": "kuery"
      },
      "legend": {
        "palette": "cool",
        "reverseColors": false,
        "steps": 10
      },
      "timelineOpen": false
    }
  }
}
```

```json
PUT /api/infra/inventory_views/random-id

Status code: 404

{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Saved object [inventory-view/random-id] not found"
}
```

Send in the payload a `name` attribute already held by another view:
```json
PUT /api/infra/inventory_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 409

{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A view with that name already exists."
}
```

## Delete one: `DELETE /api/infra/inventory_views/{inventoryViewId}`

Deletes an inventory view.

Any attempt to delete the static view with id `0` will return a `400 The inventory view with id 0 is not configurable.`

### Request

- **Method**: DELETE
- **Path**: /api/infra/inventory_views/{inventoryViewId}

### Response

```json
DELETE /api/infra/inventory_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 204 No content
```

```json
DELETE /api/infra/inventory_views/random-id

Status code: 404

{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Saved object [inventory-view/random-id] not found"
}
```

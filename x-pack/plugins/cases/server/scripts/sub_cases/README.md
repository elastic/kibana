# Sub Cases Helper Script

This script makes interacting with sub cases easier (creating, deleting, retrieving, etc).

To run the script, first `cd x-pack/plugins/cases/server/scripts`

## Showing the help

```bash
yarn test:sub-cases help
```

Sub command help

```bash
yarn test:sub-cases <sub command> help
```

## Generating alerts

This will generate a new case and sub case if one does not exist and then attach a group
of alerts to it.

```bash
yarn test:sub-cases alerts --ids id1 id2 id3
```

## Deleting a collection

This will delete a case that has sub cases.

```bash
yarn test:sub-cases delete <case id>
```

## Find sub cases

This will find sub cases attached to a collection.

```bash
yarn test:sub-cases find <case id> [status]
```

Example:

```bash
yarn test:sub-cases find 6c9e0490-64dc-11eb-92be-09d246866276
```

Response:

```bash
{
  "page": 1,
  "per_page": 1,
  "total": 1,
  "subCases": [
    {
      "id": "6dd6d2b0-64dc-11eb-92be-09d246866276",
      "version": "WzUzNDMsMV0=",
      "comments": [],
      "totalComment": 0,
      "totalAlerts": 0,
      "closed_at": null,
      "closed_by": null,
      "created_at": "2021-02-01T22:25:46.323Z",
      "status": "open",
      "updated_at": "2021-02-01T22:25:46.323Z",
      "updated_by": {
        "full_name": null,
        "email": null,
        "username": "elastic"
      }
    }
  ],
  "count_open_cases": 0,
  "count_in_progress_cases": 0,
  "count_closed_cases": 0
}
```

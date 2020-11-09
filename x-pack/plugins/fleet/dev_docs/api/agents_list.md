# Fleet agent listing API

## Request

`GET /api/fleet/agents`

## Query

- `showInactive` (Optional, boolean) Show inactive agents (default to false)
- `kuery` (Optional, string) Filter using kibana query language
- `page` (Optional, number)
- `perPage` (Optional, number)

## Response code

- `200` Indicates a successful call.

## Example

```js
GET /api/fleet/agents?kuery=fleet-agents.last_checkin:2019-10-01T13:42:54.323Z
```

# Fleet agent acks API

Agent acks
Acknowledge actions received during checkin

## Request

`POST /api/ingest_manager/fleet/agents/{agentId}/acks`

## Headers

- `Authorization` (Required, string) A valid fleet access api key..

## Request body

- `action_ids` (Required, array) An array of action id that the agent received.

## Response code

- `200` Indicates a successful call.

## Example

```js
POST /api/ingest_manager/fleet/agents/a4937110-e53e-11e9-934f-47a8e38a522c/acks
Authorization: ApiKey VALID_ACCESS_API_KEY
{
  "action_ids": ["action-1", "action-2"]
}
```

```js
{
  "action": "acks",
  "success": true,
}
```

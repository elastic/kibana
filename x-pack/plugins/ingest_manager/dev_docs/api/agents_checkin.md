# Fleet agent checkin API

Agent checkin
Report current state of a Fleet agent.

## Request

`POST /api/fleet/agents/{agentId}/checkin`

## Headers

- `Authorization` (Required, string) A valid fleet access api key..

## Request body

- `events` (Required, array) An array of events with the properties `type`, `subtype`, `message`, `timestamp`, `payload`, and `agent_id`.

- `local_metadata` (Optional, object) An object that contains the local metadata for an agent. The metadata is a dictionary of strings (example: `{ "os": "macos" }`).

## Response code

- `200` Indicates a successful call.

## Example

```js
POST /api/fleet/agents/a4937110-e53e-11e9-934f-47a8e38a522c/checkin
Authorization: ApiKey VALID_ACCESS_API_KEY
{
  "events": [{
    "type": "STATE",
    "subtype": "STARTING",
    "message": "state changed from STOPPED to STARTING",
    "timestamp": "2019-10-01T13:42:54.323Z",
    "payload": {},
    "agent_id": "a4937110-e53e-11e9-934f-47a8e38a522c"
  }]
}
```

```js
{
  "action": "checkin",
  "success": true,
  "actions": []
}
```

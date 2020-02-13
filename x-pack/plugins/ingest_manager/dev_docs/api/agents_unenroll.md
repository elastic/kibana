# Enroll Fleet agent API

Unenroll an agent

## Request

`POST /api/fleet/agents/unenroll`

## Request body

- `ids` (Optional, string) An list of agent id to unenroll.
- `kuery` (Optional, string) a kibana query to search for agent to unenroll.

> Note: one and only of this keys should be present:

## Response code

`200` Indicates a successful call.

## Example

```js
POST /api/fleet/agents/enroll
{
  "ids": ['agent1'],
}
```

The API returns the following:

```js
{
  "results": [{
    "success":true,
    "id":"agent1",
    "action":"unenrolled"
  }],
  "success":true
}
```

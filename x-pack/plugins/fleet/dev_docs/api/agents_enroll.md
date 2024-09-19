# Enroll Fleet agent API

Enroll agent

## Request

`POST /api/fleet/agents/enroll`

## Headers

- `Authorization` (Required, string) a valid enrollemnt api key.

## Request body

- `type` (Required, string) Agent type should be one of `EPHEMERAL`, `TEMPORARY`, `PERMANENT`
- `metadata` (Optional, object) Objects with `local` and `user_provided` properties that contain the metadata for an agent. The metadata is a dictionary of strings (example: `"local": { "os": "macos" }`).

## Response code

`200` Indicates a successful call.
`400` For an invalid request.
`401` For an invalid api key.

## Example

```js
POST /api/fleet/agents/enroll
Authorization: ApiKey VALID_API_KEY
{
  "type": "PERMANENT",
  "metadata": {
    "local": { "os": "macos"},
    "userProvided": { "region": "us-east"}
  }
}
```

The API returns the following:

```js
{
  "action": "created",
  "success": true,
  "item": {
    "id": "a4937110-e53e-11e9-934f-47a8e38a522c",
    "active": true,
    "policy_id": "default",
    "type": "PERMANENT",
    "enrolled_at": "2019-10-02T18:01:22.337Z",
    "user_provided_metadata": {},
    "local_metadata": {},
    "actions": [],
    "access_api_key": "ACCESS_API_KEY"
  }
}
```

## Expected errors

The API will return a response with a `401` status code and an error if the enrollment apiKey is invalid like this:

```js
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Enrollment apiKey is not valid: Enrollement api key does not exists or is not active"
}
```


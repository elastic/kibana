## Agent Fleet: actions protocol

Agent is using `actions` and `events` to comunicate with fleet during checkin.

## Actions

Action are returned to the agent during the checkin [see](./api/agents_checkin)
Agent should aknowledge actions they received using `POST /agents/{agentId}/acks` API.

### POLICY_CHANGE

This action is send when a new policy is available, the policy is available under the `data` field.

```js
{
    "type": "POLICY_CHANGE",
    "id": "action_id_1",
    "data": {
      "policy":  {
        "id": "policy_id",
        "outputs": {
          "default": {
            "api_key": "slfhsdlfhjjkshfkjh:sdfsdfsdfsdf",
            "id": "default",
            "name": "Default",
            "type": "elasticsearch",
            "hosts": ["https://localhost:9200"],
          }
        },
        "streams": [
          {
            "metricsets": [
              "container",
              "cpu"
            ],
            "id": "string",
            "type": "etc",
            "output": {
              "use_output": "default"
            }
          }
        ]
      }
    }
  }]
}
```

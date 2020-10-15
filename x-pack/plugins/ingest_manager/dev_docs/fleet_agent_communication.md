# Fleet <> Agent communication protocal

1. Makes request to the [`agent/enroll` endpoint](/docs/api/fleet.asciidoc) using the [enrollment API key](api_keys.md) as a barrier token, the policy ID being enrolled to, and the type of the agent.

2. Fleet verifies the Enrollment API key is valid. And returns back a unique [access API key](api_keys.md).

This Auth API key is created to work only for the assigned policy.
The auth API key is assigned to the combination of agent and policy, and the policy can be swapped out dynamically without creating a new auth API key.

3. The agent now "checks in" with Fleet.

The agent uses the access token to post its current event queue to [`agent/checkin`](/docs/api/fleet.asciidoc). The endpoint will return the agent's assigned policy and an array of actions for the agent or its software to run.
The agent continues posting events and receiving updated policy changes every 30 sec or via polling settings in the policy.

4. The agent takes the returned policy and array of actions and first reloads any policy changes. It then runs any/all actions starting at index 0.

### If an agent / host is compromised

1. The user via the UI or API invalidates an agent's auth API key in Fleet by "unenrolling" an agent.

2. At the time of the agent's next checkin, auth will fail resulting in a 403 error.

3. The agent will stop polling and delete the locally cached policy.

4. It is **/strongly/** recommended that if an agent is compromised, the outputs used on the given agent delete their ES access tokens, and regenerate them.

To re-enable the agent, it must be re-enrolled. Permanent and temporary agents maintain state in Fleet. If one is re-enrolled a new auth token is generated and the agent is able to resume as it was. If this is not desired, the agent will be listed in a disabled state (`active: false`) and from the details screen it can be deleted.

### If an enrollment token is compromised

Fleet only supports a single active enrollment token at a time. If one becomes compromised, it is canceled and regenerated.
The singular enrollment token helps to reduce complexity, and also helps to reenforce to users that this token is an "admin" token in that it has a great deal of power, thus should be kept secret/safe.

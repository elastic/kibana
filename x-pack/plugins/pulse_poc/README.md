# Pulse Service POC

This is the POC service code. This wouldn't actually be in the Kibana project, but it is for the POC.

To understand how this is used, see [Pulse.md](../../../PULSE.md).

## Rest API

These APIs are accessible through Kibana for this POC. The actual service would
live at a dedicated elastic.co URL.

### `POST /api/pulse_poc/intake/{deploymentId}`

Used to send channel-based telemetry into the pulse service.

### `GET /api/pulse_poc/instructions/{deploymentId}`

Used to retrieve the current set of instructions for the current deployment. The response will include any instructions for the given deployment, organized by the channel they are associated with.

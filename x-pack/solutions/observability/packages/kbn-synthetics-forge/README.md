# Synthetics Forge

Creates Synthetics monitors for scalability testing.

> [!WARNING]
> **Local Development:** This script requires a Fleet Server. For local dev, run `synthetics_private_location` first. See [Using with synthetics_private_location](#using-with-synthetics_private_location-local-development).

> [!NOTE]
> **Docker Required:** When used with Ensemble workflows, Docker Desktop must be running. The Elastic Agent runs locally in a Docker container to execute monitors against the cloud cluster.

## Usage

```bash
# Create monitors
node x-pack/scripts/synthetics_forge.js create

# Cleanup
node x-pack/scripts/synthetics_forge.js cleanup
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KIBANA_URL` | `http://localhost:5601` | Kibana URL |
| `KIBANA_USERNAME` | `elastic` | Username |
| `KIBANA_PASSWORD` | `changeme` | Password |
| `HTTP` | `1` | HTTP monitors to create |
| `TCP` | `1` | TCP monitors to create |
| `ICMP` | `1` | ICMP monitors to create |
| `BROWSER` | `1` | Browser monitors to create |
| `RESOURCE_PREFIX` | `scalability-test` | Prefix for all resources |
| `PRIVATE_LOCATION_ID` | - | Use existing private location (skips creating policy/location) |
| `OUTPUT_FILE` | - | Write output JSON to file |

## Examples

Create 10 monitors of each type:
```bash
HTTP=10 TCP=10 ICMP=10 BROWSER=5 \
node x-pack/scripts/synthetics_forge.js create
```

Use existing private location (skips creating agent policy and private location):
```bash
PRIVATE_LOCATION_ID="abc-123-def-456" HTTP=10 \
node x-pack/scripts/synthetics_forge.js create
```

Against a remote cluster (with existing private location):
```bash
KIBANA_URL="https://my-cluster.kb.us-west2.gcp.elastic-cloud.com:443" \
KIBANA_PASSWORD="mypassword" \
PRIVATE_LOCATION_ID="abc-123-def-456" \
HTTP=100 \
node x-pack/scripts/synthetics_forge.js create
```

## What it creates

| Resource | Name |
|----------|------|
| Space | `scalability-test` |
| Agent Policy | `scalability-test-policy` |
| Private Location | `scalability-test-location` |
| Monitors | `Scalability HTTP Monitor 1`, etc. |

All resources are tagged with the `RESOURCE_PREFIX` value.

## How cleanup works

The `cleanup` command identifies resources to delete by:

1. **Monitors** - Finds monitors tagged with `RESOURCE_PREFIX` or named `Scalability *`
2. **Private Locations** - Finds locations with label containing `RESOURCE_PREFIX`
3. **Agent Policies** - Finds policies with name containing `RESOURCE_PREFIX`

> [!NOTE]
> Only resources matching these patterns are deleted. Other resources are untouched.

## Output

Returns an enrollment token for deploying an Elastic Agent:

```json
{
  "spaceId": "scalability-test",
  "agentPolicyId": "abc-123",
  "privateLocationId": "def-456",
  "enrollmentToken": "xxxx==",
  "kibanaVersion": "8.17.0",
  "monitorCount": 35
}
```

> [!TIP]
> Use `OUTPUT_FILE` to save this to a file:
> ```bash
> OUTPUT_FILE=/tmp/forge_output.json node x-pack/scripts/synthetics_forge.js create
> ```

## Using with synthetics_private_location (Local Development)

For local development without a cloud cluster, use `synthetics_private_location` first to set up Fleet Server and Agent, then use `synthetics_forge` to create monitors.

**Step 1: Run synthetics_private_location**

This creates Fleet Server, Agent Policy, Private Location, and enrolls an Agent:
```bash
node x-pack/scripts/synthetics_private_location.js
```

Look for this output:
```
════════════════════════════════════════════════════════════════
  SYNTHETICS PRIVATE LOCATION CREATED
════════════════════════════════════════════════════════════════
  Private Location ID:    abc-123-def-456
  Private Location Label: Private location
  Agent Policy ID:        xyz-789

  To use with synthetics_forge:
  PRIVATE_LOCATION_ID="abc-123-def-456"
════════════════════════════════════════════════════════════════
```

**Step 2: Run synthetics_forge with the Private Location ID**
```bash
PRIVATE_LOCATION_ID="abc-123-def-456" \
HTTP=10 TCP=10 ICMP=10 BROWSER=5 \
node x-pack/scripts/synthetics_forge.js create
```

> [!NOTE]
> This skips creating agent policy and private location, and only creates monitors in the existing location.

## Using with Cloud Clusters (ESS)

For cloud clusters, you can use an existing private location.

**Find or create a Private Location:**

1. Go to **Synthetics** → **Settings** → **Private Locations**
2. Create a new location or click on an existing one
3. The ID is in the URL: `/app/synthetics/settings/private-locations/{ID}`

**Then run:**
```bash
KIBANA_URL="https://your-cluster.kb.us-west2.gcp.elastic-cloud.com:443" \
KIBANA_PASSWORD="password" \
PRIVATE_LOCATION_ID="your-location-id" \
HTTP=100 \
node x-pack/scripts/synthetics_forge.js create
```

> [!TIP]
> If no private location exists, omit `PRIVATE_LOCATION_ID` and the script will create one.

## Using with Ensemble

This script is used by Ensemble workflows for automated scalability testing. The workflow:

1. Creates an ESS cluster in the cloud
2. Runs `synthetics_forge` to create monitors
3. Deploys an Elastic Agent in a **local Docker container**
4. The agent connects to the cloud Fleet Server and executes monitors

**Requirements:**
- Docker Desktop must be running
- The `elastic-agent-complete` image is used (includes Chromium for browser monitors)

See the [Ensemble README](../../../test/ensemble/README.md) for setup and usage.

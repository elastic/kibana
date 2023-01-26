# Fleet Data Model

The Fleet plugin has 3 sources of data that it reads and writes to, these large categories are:

- **Package Registry**: read-only data source for retrieving packages published by Elastic
- **`.fleet-*` Indices**: read & write data source for interacting with Elastic Agent policies, actions, and enrollment tokens
- **Saved Objects**: read & write data source for storing installed packages, configured policies, outputs, and other settings

## Package Registry

The package registry hosts all of the packages available for installation by Fleet. The Fleet plugin in Kibana interacts
with the registry exclusively through read-only JSON APIs for listing, searching, and download packages. Read more about
the available APIs in the [package-registry repository](https://github.com/elastic/package-registry).

By default, the Fleet plugin will use Elastic's nightly 'snapshot' registry on the `master` branch, the 'staging'
registry on Kibana nightly snapshot builds, and the 'prod' registry for release builds. The registry that will be used
can be configured by setting the `xpack.fleet.registryUrl` in the `kibana.yml` file.

The code that integrates with this registry API is contained in the
[`x-pack/plugins/fleet/server/services/epm/registry`](../server/services/epm/registry) directory.

## `.fleet-*` Indices

For any data that needs to be accessible by Fleet Service instances to push updates to, we write and read data
directly to a handful of `.fleet-` Elasticsearch indices. Fleet Server instances are configured with an API key that
has access only to these indices.

In prior alpha versions of Fleet, this data was also stored in Saved Objects because Elastic Agent instances were
communicating directly with Kibana for policy updates. Once Fleet Server was introduced, that data was migrated to these
Elasticsearch indices to be readable by Fleet Server.

_Note: All of these system indices are plain indices, and not data streams._

### `.fleet-agents` index

Each document in this index tracks an individual Elastic Agent's enrollment in the Fleet, which policy it is current
assigned to, its check in status, which packages are currently installed, and other metadata about the Agent.

All of the code that interacts with this index is currently located in
[`x-pack/plugins/fleet/server/services/agents/crud.ts`](../server/services/agents/crud.ts) and the schema of these
documents is maintained by the `FleetServerAgent` TypeScript interface.

- Cleanup model: N/A

### `.fleet-actions` index

Each document in this index represents an action that was initiated by a user and needs to be processed by Fleet Server
and sent to any agents that it applies to. Actions can apply to one or more agents. There are different types of actions
that can be created such as policy changes, unenrollments, upgrades, etc. See the `AgentActionType` type for a complete
list.

The total schema for actions is represented by the `FleetServerAgentAction` type.

- Cleanup model: Fleet Server considers actions expired after 30 days, and will remove them via an hourly process
- [Source](https://github.com/elastic/fleet-server/blob/9af3b2176b42a0de34c5583b5430558c03792dd0/internal/pkg/gc/schedules.go#L29-L33)

### `.fleet-actions-results`

- Cleanup model: N/A

### `.fleet-servers`

- Cleanup model: N/A

### `.fleet-artifacts`

- Cleanup model: N/A

### `.fleet-enrollment-api-keys`

- Cleanup model: Deleteable via Fleet UI/API, deleted when an agent policy is deleted
- [Source](https://github.com/elastic/kibana/blob/7a35748cb43f2c73623ffda6fa02b91c3cb4c689/x-pack/plugins/fleet/server/services/api_keys/enrollment_api_key.ts#L102)

### `.fleet-policies`

- Cleanup model: Deleted when a corresponding agent policy is deleted in the Fleet UI or API
- [Source](https://github.com/elastic/kibana/blob/976b1b2331371f4a1325f6947d38d1f4de7a7254/x-pack/plugins/fleet/server/services/agent_policy.ts#L699-L701)

### `.fleet-policies-leader`

- Cleanup model: N/A

## Saved Object types

The Fleet plugin leverages several Saved Object types to track metadata on install packages, agent policies, and more.
This document is intended to outline what each type is for, the primary places it's accessed from in the codebase, and
any caveats regarding the history of that saved object type.

At this point in time, all types are currently:

- `hidden: false`
- `namespaceType: agnostic`
- `management.importableAndExportable: false`

### `ingest_manager_settings`

- Constant in code: `GLOBAL_SETTINGS_SAVED_OBJECT_TYPE`
- Introduced in ?
- Migrations: 7.10.0, 7.13.0
- [Code Link](../server/saved_objects/index.ts#57)

Tracks the Fleet server host addresses and whether or not the cluster has been shown the "add data" and
"fleet migration" notices in the UI.

Can be accessed via the APIs exposed in the [server's settings service](../server/services/settings.ts).

### `ingest-agent-policies`

- Constant in code: `AGENT_POLICY_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#136)
- Migrations: 7.10.0, 7.12.0
- References to other objects:
  - `package_policies` - array of IDs that point to the specific integration instances for this agent policy (`ingest-package-policies`)

The overall policy for a group of agents. Each policy consists of specific integration configurations for a group of
enrolled agents.

### `ingest-package-policies`

- Constant in code: `PACKAGE_POLICY_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#212)
- Migrations: 7.10.0, 7.11.0, 7.12.0, 7.13.0, 7.14.0, 7.15.0
- References to other objects:
  - `policy_id` - ID that points to an agent policy (`ingest-agent-policies`)

Contains the configuration for a specific instance of a package integration as configured for an agent policy.

### `ingest-outputs`

- Constant in code: `OUTPUT_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#190)
- Migrations: 7.13.0

Contains configuration for ingest outputs that can be shared across multiple `ingest-package-policies`. Currently the UI
only exposes a single Elasticsearch output that will be used for all package policies, but in the future this may be
used for other types of outputs like separate monitoring clusters, Logstash, etc.

### `ingest-download-sources`
- Constant in code: `DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#329)
- Migrations: 8.4.0, 8.5.0

Contains configuration for the download source objects that allow users to configure a custom registry
for downloading the Elastic Agent. The default value is for the registry is `https://artifacts.elastic.co/downloads/`. The UI exposes this configuration in Settings.

### `epm-packages`

- Constant in code: `PACKAGES_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#279)
- Migrations: 7.14.0, 7.14.1
- References to other objects:
  - `installed_es` - array of assets installed into Elasticsearch
    - `installed_es.id` - ID in Elasticsearch of an asset (eg. `logs-system.application-1.1.2`)
    - `installed_es.type` - type of Elasticsearch asset (eg. `ingest_pipeline`)
  - `installed_kibana_space_id` - the id of the space the assets were installed in (eg. `default`)
  - `installed_kibana` - array of assets that were installed into Kibana
    - `installed_kibana.id` - Saved Object ID (eg. `system-01c54730-fee6-11e9-8405-516218e3d268`)
    - `installed_kibana.type` - Saved Object type name (eg. `dashboard`)
  - `package_assets` - array of original file contents of the package as it was installed
    - `package_assets.id` - Saved Object ID for a `epm-package-assets` type
    - `package_assets.type` - Saved Object type for the asset. As of now, only `epm-packages-assets` are supported.

Contains metadata on an installed integration package including references to all assets installed in Kibana and
Elasticsearch. This allows for easy cleanup when a package is removed or upgraded.

### `epm-packages-assets`

- Constant in code: `ASSETS_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#328)
- Migrations:
- References to other objects:

Contains the raw file contents of a package, where each document represents one file from the original package. Storing
these as Saved Objects allows Fleet to install package contents when the package registry is down or unavailable. Also
allows for installing packages that were uploaded manually and are not from a package registry. The `asset_path` field
represents the relative file path of the file from the package contents
(eg. `system-1.1.2/data_stream/application/agent/stream/httpjson.yml.hbs`).

### `fleet-preconfiguration-deletion-record`

- Constant in code: `PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE`
- Introduced in ?
- [Code Link](../server/saved_objects/index.ts#328)
- Migrations:
- References to other objects:
  - `id` - references the policy ID from the preconfiguration API

Used as "tombstone record" to indicate that a package that was installed by default through preconfiguration was
explicitly deleted by user. Used to avoid recreating a preconfiguration policy that a user explicitly does not want.

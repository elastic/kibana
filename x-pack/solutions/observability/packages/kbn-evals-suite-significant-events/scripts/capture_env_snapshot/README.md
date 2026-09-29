# Capture Environment Snapshot

Captures the current Streams/Significant Events environment into a GCS snapshot. Significant Events data streams are reindexed to snapshot-safe names with mappings preserved, then everything is snapshotted together.

## Prerequisites

- The environment must already contain all the data you want to capture (logs, alerts, Streams features/assets, etc.). This script only snapshots existing indices — it does not generate or ingest any data. Run the appropriate data generation scripts (e.g. OTel demo, Significant Events scenarios) before capturing.
- Local Elasticsearch with GCS credentials in the keystore.
- Credentials with `manage_security` privilege (see [Required privileges](#required-privileges)).

## Why

Significant Events data streams must be restored through their plugin-owned templates rather than as plain indices. This script fetches each stream's mapping, creates a regular `snapshot-*` copy, reindexes the data, and snapshots that copy together with the logs and alerts indices.

## Usage

```bash
node scripts/capture_sigevents_env_snapshot.js --snapshot-name my-snapshot
```

### With custom options

```bash
node scripts/capture_sigevents_env_snapshot.js \
  --snapshot-name my-snapshot \
  --run-id <run-id> \
  --logs-index <custom-logs-index> \
```

### Flags

| Flag | Description | Default |
| --- | --- | --- |
| `--snapshot-name` | **Required.** Name for the snapshot. | none |
| `--run-id` | Run identifier for GCS repo name and base path. | Today's date `YYYY-MM-DD` |
| `--logs-index` | Logs index to include in the snapshot + replay. | `logs.otel` |
| `--alert-indices` | Alert index to include in the snapshot + replay. Can be repeated. | `.internal.alerts-streams.alerts-default-*` |
| `--es-url` | Elasticsearch URL | from `config/kibana.dev.yml` |
| `--es-username` | Elasticsearch username | from `config/kibana.dev.yml` |
| `--es-password` | Elasticsearch password | from `config/kibana.dev.yml` |

## How it works

1. Creates a temporary Elasticsearch user (`restore_sigevents_env_snapshot_tmp`) with the `system_indices_superuser` role. This user is deleted on script exit (success or failure).
2. Resolves wildcard patterns to concrete index names via `GET _resolve/index`.
3. For each SigEvents data stream, fetches the mapping, creates a `snapshot-*` copy, and reindexes the data. Discoveries and detections are skipped silently when absent — the user may not have run the discovery workflow. `--logs-index` and `--alert-indices` targets are included directly without reindexing.
4. Registers a GCS snapshot repository and creates the snapshot containing all captured indices.

### Naming convention

SigEvents data streams are reindexed to a `snapshot-*` copy (leading `.` is replaced). Discoveries/detections are omitted entirely when not captured:

| Source index | Snapshot index |
| --- | --- |
| `.significant_events-knowledge_indicators` | `snapshot-significant_events-knowledge_indicators` |
| `.significant_events-discoveries` | `snapshot-significant_events-discoveries` (if workflow was run) |
| `.significant_events-detections` | `snapshot-significant_events-detections` (if workflow was run) |
| `.internal.alerts-streams.alerts-default-000001` | `.internal.alerts-streams.alerts-default-000001` (no change) |
| `logs.otel` | `logs.otel` (no change) |

## Restoring

After capturing a snapshot, use the restore script to bring up a fresh environment:

```bash
node scripts/restore_sigevents_env_snapshot.js \
  --gcs-bucket significant-events-datasets \
  --gcs-base-path <run-id>/<base-path> \
  --snapshot-name <snapshot-name>
```

See [`restore_env_snapshot/README.md`](../restore_env_snapshot/README.md) for the full restore workflow and all available flags.

## Required privileges

The script automatically creates and deletes a temporary `system_indices_superuser` user. On self-managed Elasticsearch the `system_indices_superuser` role may not exist; the script creates it automatically on first run (it is a built-in on Elastic Cloud). The credentials you pass (`--es-username` / `--es-password`) only need the `manage_security` cluster privilege — the built-in `elastic` superuser works out of the box.

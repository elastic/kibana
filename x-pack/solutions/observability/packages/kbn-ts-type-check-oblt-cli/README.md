# @kbn/ts-type-check-oblt-cli

CLI tool for running TypeScript type checks across Kibana Observability projects, with support for artifact caching via Google Cloud Storage (GCS) to speed up incremental type checks in both local development and CI environments.

## Overview

This package wraps the TypeScript compiler (`tsc --build`) and adds several performance-oriented features on top:

- **Artifact caching**: TypeScript build artifacts (`target/types/`, `tsconfig*.type_check.json`) are
  cached in GCS and can be restored before a type check. A restored cache makes the full type check
  **10-20x faster** (1-2 min vs 20-25 min) because `tsc` skips every project whose outputs are
  already up-to-date. Once restored, the cache stays useful across branch switches — on the next run,
  `tsc` incrementally rebuilds only the projects affected by your local changes. You do not need to
  restore from GCS on every run.
- **Stale artifact detection**: After a restore, the CLI compares the archived commit SHA against
  `HEAD` and lists any projects with stale artifacts, so you can decide at a glance whether a fresh
  restore (`--clean-cache --with-archive`) is worthwhile.
- **Fail-fast pass**: When running locally without a project filter, it first type-checks only the projects containing locally modified files, giving immediate feedback before the full build runs.

The expected runtime of the type check with artifacts restored from GCS is 1-2 minutes.

The expected runtime of the type check without artifacts restored from GCS is 20-25 minutes.

## Usage

```bash
# Only restore cached build artifacts without running the type check
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --restore-artifacts

# Restore cached artifacts from GCS and do a full type check
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --with-archive

# Check types in all projects, and do not restore cache from GCS
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js

# Delete all TypeScript caches and perform a full type check
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --clean-cache

# Check types in a single project
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --project packages/kbn-pm/tsconfig.json

# Show extended TypeScript compiler diagnostics
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --extended-diagnostics
```

## CLI Flags

| Flag | Description |
|---|---|
| `--project <path>` | Path to a `tsconfig.json` file; limits type checking to that project only. |
| `--clean-cache` | Deletes all TypeScript caches and generated config files before running. |
| `--with-archive` | Restores cached build artifacts before running and archives results afterwards. Locally, tries GCS first (requires `gcloud auth login`) and falls back to a local file-system cache. |
| `--restore-artifacts` | Only restores cached build artifacts without running the type check. Useful for pre-populating the cache. |
| `--extended-diagnostics` | Passes `--extendedDiagnostics` to `tsc` for detailed compiler performance output. |

## Artifact Caching

When `--with-archive` is provided, the CLI manages a cache of TypeScript build artifacts:

- **On CI**: Archives are read from and written to the `ci-typescript-archives` GCS bucket under `ts_type_check/commits/<sha>/` and `ts_type_check/prs/<pr-number>/`.
- **Locally**: The CLI first attempts to fetch artifacts from GCS using the developer's `gcloud` credentials (run `gcloud auth login` if needed). If GCS is unavailable, it falls back to a local disk cache at `$TMPDIR/kibana-ts-type-check-cache/archives/`.



## Owner

[@elastic/observability-ui](https://github.com/orgs/elastic/teams/observability-ui)

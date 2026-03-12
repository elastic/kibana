# @kbn/ts-type-check-oblt-cli

CLI tool for running TypeScript type checks across Kibana Observability projects, with GCS-backed artifact caching to make incremental type checks fast in local development.

## Overview

This package wraps `tsc --build` and adds several performance features on top:

- **Smart cache restore**: Before each run, the CLI checks whether local artifacts are already
  fresh. If not, it automatically fetches a matching archive from GCS (no flags needed) and
  restores it silently. A restored cache makes the full type check **10-20× faster** (1-2 min
  vs 20-25 min) because `tsc` skips every project whose outputs are already up-to-date. Once
  restored, the cache stays useful across branch switches — on the next run `tsc` only rebuilds
  the projects touched by your local changes.

- **Effective rebuild count**: Staleness is measured not just by which projects changed directly,
  but by how many projects would need rebuilding in total (including all transitive dependents).
  A foundational package touched by just one commit can cascade into hundreds of dependent
  rebuilds, so raw stale count is a poor signal. When the effective rebuild count exceeds the
  threshold, the CLI finds the best available GCS archive and runs a second `git diff` to check
  how many projects would still be stale *after* a restore. The restore only happens if it
  genuinely reduces the work — so changing a foundational package intentionally does not trigger
  a pointless 2-minute download.

- **Fail-fast pass**: When running locally without a project filter, the CLI first type-checks
  only the projects containing locally modified files (~10-15 s), giving immediate feedback
  before the full build starts.

- **Artifact state tracking**: After every successful full run, the current HEAD SHA is written
  to `data/kbn-ts-type-check-oblt-artifacts.sha`. This lets subsequent runs accurately compute
  staleness from the actual state of your local artifacts rather than guessing.

## Usage

```bash
# Run the type check (smart cache restore happens automatically)
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js

# Check types in a single project
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --project packages/kbn-pm/tsconfig.json

# Delete all TypeScript caches (useful when you want a guaranteed clean slate)
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --clean-cache

# Only restore cached build artifacts without running the type check
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --restore-artifacts

# Show extended TypeScript compiler diagnostics
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --extended-diagnostics
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--project <path>` | Path to a `tsconfig.json` file; limits type checking to that project only. |
| `--clean-cache` | Deletes all TypeScript caches and generated config files. |
| `--restore-artifacts` | Only restores cached build artifacts from GCS without running the type check. Useful for pre-populating the cache. |
| `--extended-diagnostics` | Passes `--extendedDiagnostics` to `tsc` for detailed compiler performance output. |

## How the cache works

On each run the CLI goes through the following steps:

1. **Check local state**: Read `data/kbn-ts-type-check-oblt-artifacts.sha` to find out which
   commit the current local artifacts correspond to. If no artifacts or no state file exist,
   skip straight to step 4.

2. **Assess staleness**: Run `git diff <stateSha>..HEAD` to find directly changed projects, then
   expand via BFS over the reverse dependency graph to compute the *effective rebuild count*
   (directly stale projects plus all transitive dependents).

3. **Decide on restore**: If the effective rebuild count is within the threshold, proceed with
   the local artifacts — `tsc` will handle the small set of stale projects incrementally.
   If it exceeds the threshold:
   - Find the best available GCS archive SHA (most recent ancestor present in the bucket).
   - Run a second `git diff <gcsSha>..HEAD` and compute the effective rebuild count from
     that baseline. This is a cheap local operation — no download yet.
   - Only restore if the GCS archive would actually reduce the rebuild count. If the archive
     is equally stale (e.g. the user intentionally changed a foundational package), skip the
     restore and let `tsc` handle it locally.

4. **Generate configs**: Write (or update) `tsconfig.type_check.json` files for every project.
   After a restore, the mtime of any rewritten config is reset to its pre-write value so `tsc`
   does not treat updated reference lists as a reason to rebuild on the first post-restore run.

5. **Fail-fast pass** *(local only)*: Type-check the projects with uncommitted changes.

6. **Full pass**: Run `tsc --build` across all projects.

7. **Record state**: Write the current HEAD SHA to the state file.

## Artifact storage

Archives are stored in the `ci-typescript-archives` GCS bucket under:

- `ts_type_check/commits/<sha>/` — per-commit archives created by CI
- `ts_type_check/prs/<pr-number>/` — PR-level archives

Read access is public (no credentials required).

## Owner

[@elastic/observability-ui](https://github.com/orgs/elastic/teams/observability-ui)

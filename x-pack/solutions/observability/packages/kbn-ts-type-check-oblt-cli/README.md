# @kbn/ts-type-check-oblt-cli

CLI tool for running TypeScript type checks across Kibana Observability projects, with GCS-backed artifact caching to make incremental type checks fast in local development.

## Overview

This package wraps `tsc --build` and adds several performance features on top:

- **Smart cache restore**: Before each run, the CLI checks whether local artifacts are already
  fresh. If not, it automatically fetches a matching archive and restores it silently (no flags
  needed). A restored cache makes the full type check **10-20× faster** (1-2 min vs 20-25 min)
  because `tsc` skips every project whose outputs are already up-to-date. Once restored, the
  cache stays useful across branch switches — on the next run `tsc` only rebuilds the projects
  touched by your local changes.

- **Selective restore**: When a local cache server is running and only a subset of projects are
  stale, the CLI sends the list of stale projects to the server and receives back only the
  per-project archives it actually needs. This avoids downloading and extracting the full
  ~180 MB archive when only a handful of projects changed.

- **Smart archive selection**: The CI produces two kinds of archives — `on_merge` commit
  archives (built after a PR is squash-merged into main) and PR archives (built during CI on
  each PR branch). Both are candidates for restoration. The CLI compares them using estimated
  rebuild cost: source-file staleness (`git diff archiveSha HEAD`) plus, for PR archives, a
  fixed `PR_OVERHEAD` penalty (currently 0 — experiments showed no measurable inherent overhead
  from using a PR archive vs a commit archive) and a per-package graph-staleness penalty for
  any `kibana.jsonc` packages added after the archive was built. The archive with the lowest
  total cost is selected.

- **Effective rebuild count**: Staleness is measured not just by which projects changed directly,
  but by how many projects would need rebuilding in total (including all transitive dependents).
  A foundational package touched by just one commit can cascade into hundreds of dependent
  rebuilds, so raw stale count is a poor signal. When the effective rebuild count exceeds the
  threshold (currently 10 projects), the CLI finds the best available GCS archive and runs a
  second `git diff` to check how many projects would still be stale *after* a restore. The
  restore only happens if it genuinely reduces the work — so changing a foundational package
  intentionally does not trigger a pointless 2-minute download.

- **Automatic bootstrap repair**: Before any network I/O, the CLI validates that every
  `kbn_references` entry in the project graph resolves to a known TypeScript project. If any
  reference is broken (e.g. a new package was added to main but `yarn kbn bootstrap` hasn't
  run yet), the CLI runs `yarn kbn bootstrap` automatically and re-execs itself to pick up the
  updated module state — avoiding a cryptic crash after a multi-minute GCS download.

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

# Restore a specific commit's archive without running the type check
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --restore-artifacts=8b2b01245a74921cdea9d149f9e894c8d3cce046

# Show extended TypeScript compiler diagnostics
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --extended-diagnostics

# Show verbose output including internal timing breakdowns
node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --verbose
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--project <path>` | Path to a `tsconfig.json` file; limits type checking to that project only. |
| `--clean-cache` | Deletes all TypeScript caches and generated config files. |
| `--restore-artifacts [=sha]` | Only restores cached build artifacts without running the type check. When a SHA is provided (e.g. `--restore-artifacts=<sha>`), restores that exact commit's archive; otherwise runs full candidate discovery. Useful for pre-populating the cache or testing a specific archive. |
| `--extended-diagnostics` | Passes `--extendedDiagnostics` to `tsc` for detailed compiler performance output. |
| `--verbose` | Enables verbose logging, including internal timing breakdowns for download, extraction, and scan phases. |

## Cache server (optional)

When restoring artifacts, the CLI first tries a **local cache server** (default `http://127.0.0.1:3081`). The server pre-ingests GCS archives into granular per-project blobs so only the stale projects need to be transferred.

- Set `TS_TYPE_CHECK_CACHE_SERVER_URL` to the server base URL (e.g. `http://127.0.0.1:3081`). Omit or leave unset to use the default. Using `127.0.0.1` instead of `localhost` avoids IPv6 resolution issues.
- Set `TS_TYPE_CHECK_CACHE_SERVER_URL=` (empty) to disable the cache server and always use GCS.

### Restore protocols

The CLI uses two different protocols depending on the restore type:

**Selective restore** (stale projects known): the CLI POSTs the list of stale project paths to the server. The server responds with `Content-Type: application/x-artifact-stream` — a sequence of length-prefixed blobs, one per project:

```
[4-byte big-endian uint32: blob length][raw .tar.gz blob] × N
```

Each blob is a complete per-project `.tar.gz` that the CLI extracts immediately as it arrives, pipelining download and extraction without buffering the full response. Progress is shown as `Restoring X/N projects`.

**Full restore** (no project filter, or server unavailable): the CLI falls back to streaming the full combined archive directly from GCS (`Content-Type: application/gzip`). Progress is shown as a download bar with speed and size, followed by an extraction bar with percentage and estimated time remaining.

In both cases, stale artifact directories are cleaned before new files are written — for a selective restore only the `target/types` directories of the affected projects are removed; for a full restore all type-check artifact directories are wiped.

## How the cache works

On each run the CLI goes through the following steps:

1. **Check local state**: Read `data/kbn-ts-type-check-oblt-artifacts.sha` to find out which
   commit the current local artifacts correspond to. If no artifacts or no state file exist,
   skip straight to step 4.

2. **Assess staleness**: Run `git diff <stateSha>..HEAD` to find directly changed projects, then
   expand via BFS over the reverse dependency graph to compute the *effective rebuild count*
   (directly stale projects plus all transitive dependents).

3. **Decide on restore**: If the effective rebuild count is within the threshold (10 projects),
   proceed with the local artifacts — `tsc` will handle the small set of stale projects
   incrementally. If it exceeds the threshold:
   - Discover candidate GCS archives: the most recent `on_merge` commit ancestor and the most
     recent PR archive (if available), both in parallel.
   - Run `git diff <archiveSha>..HEAD` for each candidate to measure source-file staleness.
     This is a cheap local operation — no download yet.
   - Select the best archive using `selectBestArchive`: commit archives are preferred by
     default, but a PR archive wins when it is more recent after accounting for graph-diff
     overhead (see **Smart archive selection** above).
   - Only restore if the selected archive would actually reduce the rebuild count. If both
     archives are equally stale (e.g. the user intentionally changed a foundational package),
     skip the restore and let `tsc` handle it locally.

4. **Restore** *(when needed)*: If a local cache server is running and the stale project list
   is known, request only those project archives via the selective restore protocol. Otherwise
   download the full archive from GCS. Either way, stale artifact directories are cleaned
   before new files are written.

5. **Generate configs**: Write (or update) `tsconfig.type_check.json` files for every project.
   After a restore, the mtime of any rewritten config is reset to its pre-write value so `tsc`
   does not treat updated reference lists as a reason to rebuild on the first post-restore run.

6. **Fail-fast pass** *(local only)*: Type-check the projects with uncommitted changes.

7. **Full pass**: Run `tsc --build` across all projects.

8. **Record state**: Write the current HEAD SHA to the state file.

## Log output

All log lines are prefixed with a category in brackets:

| Category | Meaning |
|----------|---------|
| `[Cache check]` | Staleness assessment and restore decision logic. |
| `[Cache]` | Cache server communication, archive download, and extraction progress. |
| `[TypeCheck]` | TypeScript compiler invocations and overall elapsed time. |
| `[timing]` | Verbose-only internal timing breakdowns (download, extraction, scan). |

### Progress reporting

When running interactively (`process.stdout.isTTY`), downloads and type-check progress are
shown as in-place animated bars. In non-TTY environments (CI, piped output, agents), these
are replaced with periodic log lines:

```
info [Cache] Downloading: 45.0 MB / 180.0 MB (25%) at 5.9 MB/s
info [TypeCheck] [Full pass] 500 / 1313 projects (38%) — 2 rebuilt, 498 up-to-date | 5s elapsed
```

### Rebuild summary

After each type-check pass, a per-project timing summary is printed for any projects that
were rebuilt. Duplicate short names are disambiguated by prepending the parent directory:

```
info [TypeCheck] [Full pass] Rebuilt 2 project(s):
info [TypeCheck] [Full pass]   platform/test (25.3s)
info [TypeCheck] [Full pass]   observability/test (8.1s)
```

## Artifact storage

Archives are stored in the `ci-typescript-archives` GCS bucket under:

- `ts_type_check/commits/<sha>/` — per-commit archives created by CI
- `ts_type_check/prs/<pr-number>/` — PR-level archives

Read access is public (no credentials required).

## Owner

[@elastic/observability-ui](https://github.com/orgs/elastic/teams/observability-ui)

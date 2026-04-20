/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';
import execa from 'execa';
import { MAX_COMMITS_TO_CHECK, CACHE_INVALIDATION_FILES } from './constants';
import type { GcsFileSystem } from './file_system/gcs_file_system';
import {
  buildCandidateShaList,
  extractPrNumberFromCommitMessage,
  readMainBranchCommitShas,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';
import { isCacheServerAvailable } from './cache_server_client';
import { detectStaleArtifacts } from './detect_stale_artifacts';
import { getChangedInvalidationFiles } from './artifacts_state';
import { calculateFileHashes } from './utils';

/**
 * Estimated additional rebuilds caused per package added to the project graph
 * since a PR archive was built. Each new package was absent from the archive
 * and must be compiled from scratch on first restore.
 */
const STALENESS_WEIGHT = 15;

/**
 * Fixed rebuild overhead added when comparing a PR archive against a commit
 * archive. Experiments showed that the anticipated extra cost from .tsbuildinfo
 * hash differences between the PR branch and squash-merge commit does not
 * materialise in practice, so this is 0.
 */
export const PR_OVERHEAD = 0;

/**
 * Packages added/removed from the project graph (kibana.jsonc files) between
 * the archive commit and HEAD. Only populated for PR archives — commit archives
 * are always built from the final squash-merge state and are complete.
 */
interface ProjectGraphDiff {
  /** Packages whose kibana.jsonc was added after the archive was built.
   *  Each added package must be compiled from scratch on first restore since
   *  the archive's .tsbuildinfo doesn't reference it yet. */
  added: string[];
  /** Packages whose kibana.jsonc was removed after the archive was built. */
  removed: string[];
}

/**
 * Returns the packages added/removed from the project graph between the archive
 * commit and HEAD. Runs git diff on kibana.jsonc files only — fast local op.
 */
async function getProjectGraphDiff(archiveSha: string): Promise<ProjectGraphDiff> {
  try {
    const { stdout } = await execa(
      'git',
      ['diff', '--name-status', archiveSha, 'HEAD', '--', '**/kibana.jsonc'],
      { cwd: REPO_ROOT }
    );
    const added: string[] = [];
    const removed: string[] = [];
    for (const line of stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      const [status, ...rest] = line.split(/\s+/);
      const file = rest.join(' ');
      if (status === 'A') added.push(file);
      else if (status === 'D') removed.push(file);
    }
    return { added, removed };
  } catch {
    // Archive SHA not in local git store or other failure — treat as unknown.
    return { added: [], removed: [] };
  }
}

/**
 * Returns the estimated total rebuild count after restoring from an archive,
 * combining source-file staleness (from git diff) with project-graph staleness
 * (fresh builds required for packages added since the archive was built).
 * Use this instead of the raw git-diff count when comparing archive costs.
 */
export function estimatedTotalRebuildCount(
  archive: BestGcsArchive,
  sourceStaleCount: number
): number {
  const graphDiffOverhead = (archive.projectGraphDiff?.added.length ?? 0) * STALENESS_WEIGHT;
  return sourceStaleCount + graphDiffOverhead;
}

/**
 * A resolved GCS archive reference, from either commits/<sha>/ or prs/<prNumber>/.
 */
export interface BestGcsArchive {
  /** Canonical commit SHA for git operations, staleness detection, and the state file.
   *  Always present in the local git object store (fetched with upstream/main).
   *  For commit archives: the commit SHA itself.
   *  For PR archives: the upstream/main merge commit (same tree as the PR tip,
   *  since Kibana uses squash merges). */
  sha: string;
  /** PR number if the archive lives at prs/<prNumber>/ instead of commits/<sha>/. */
  prNumber?: string;
  /** PR branch tip SHA; only set for PR archives.
   *  Used as the shas lookup key in restoreArchive (metadata.json's commitSha).
   *  Not guaranteed to be present in the local git object store. */
  prTipSha?: string;
  /** Best commit archive to fall back to when this archive is invalidated by a
   *  node_modules change (i.e. yarn.lock differs between this archive and HEAD).
   *  Only set when this is a PR archive that supersedes an older commit archive. */
  fallbackCommitSha?: string;
  /** File hashes (yarn.lock, .nvmrc, etc.) recorded when the PR archive was built.
   *  Present only for PR archives. Used to verify node_modules compatibility via
   *  the stored hash rather than a git diff of the main merge commit — the merge
   *  commit's yarn.lock may have been updated on main after the PR CI ran, making
   *  the git diff unreliable for PR archives. */
  prBuildFileHashes?: Record<string, string>;
  /** Packages added/removed from the project graph since the PR archive was built.
   *  PR CI runs on the PR branch which may predate recently added packages, so the
   *  archive's .tsbuildinfo files won't reference those new packages — they must be
   *  compiled from scratch on first restore. Not set for commit archives (always
   *  built from the current state). */
  projectGraphDiff?: ProjectGraphDiff;
}

/**
 * Returns true if any cache-invalidation file changed between the given archive
 * and HEAD, meaning the archive was built against a different node_modules and
 * cannot be safely used as incremental tsc input.
 * Logs a warning when the check fires so the reason is visible to the user.
 *
 * For PR archives the check compares the metadata's stored hashes against the
 * current file hashes rather than using a git diff of the main merge commit.
 * This is necessary because a PR's CI may run before a yarn.lock update lands
 * on main — the squash merge commit then gets main's updated yarn.lock, making
 * the git diff return "no changes" even though the archive was built with an
 * older lock file and is therefore incompatible with the current node_modules.
 */
async function archiveInvalidatedByNodeModulesChange(
  archive: BestGcsArchive,
  log: SomeDevLog
): Promise<boolean> {
  const archiveLabel = archive.prNumber
    ? `${archive.sha.slice(0, 12)} (PR #${archive.prNumber})`
    : archive.sha.slice(0, 12);

  let changed: string[];

  if (archive.prBuildFileHashes) {
    // PR archives: use the hashes recorded in the archive's metadata.json.
    // The metadata reflects what the archive was actually built with, which may
    // differ from the main merge commit's files if yarn.lock was updated after
    // the PR's CI ran.
    const filesToCheck = CACHE_INVALIDATION_FILES.filter(
      (f) => archive.prBuildFileHashes![f] !== undefined
    );
    if (filesToCheck.length !== CACHE_INVALIDATION_FILES.length) {
      // Partial or missing hashes — a PR archive with incomplete metadata cannot
      // be trusted against the current node_modules; treat as invalidated.
      changed = [...CACHE_INVALIDATION_FILES];
    } else {
      const currentHashes = await calculateFileHashes(filesToCheck);
      changed = filesToCheck.filter((f) => currentHashes[f] !== archive.prBuildFileHashes![f]);
    }
  } else {
    // Commit archives: git diff the archive SHA against HEAD.
    // If git fails (e.g. SHA not in local history), treat as invalidated to be safe.
    changed = (await getChangedInvalidationFiles(archive.sha)) ?? [...CACHE_INVALIDATION_FILES];
  }

  if (changed.length > 0) {
    const fileList = changed.join(', ');
    const verb = changed.length === 1 ? 'is' : 'are';
    log.warning(
      `[Cache check] Closest available archive on GCP is ${archiveLabel}. ` +
        `However, ${fileList} ${verb} different, so the archive was built with a different node_modules folder. ` +
        `Archive is unreliable for HEAD — skipping restore of this archive.`
    );
    return true;
  }
  return false;
}

/**
 * For each unmatched main commit, attempts to find a PR archive by parsing
 * the PR number from the commit message (Kibana squash-merges append "(#NNNN)")
 * and fetching prs/<prNumber>/metadata.json from GCS.
 *
 * This bridges the gap between a commit landing on upstream/main and its
 * on_merge CI job completing and uploading a commit archive. The PR archive
 * created during PR CI is available immediately and contains the same artifacts,
 * since Kibana uses squash merges whose final tree is identical to the PR tip.
 */
async function resolvePrFallbackMatches(
  log: SomeDevLog,
  gcsFs: GcsFileSystem,
  unmatchedMainShas: string[]
): Promise<BestGcsArchive[]> {
  log.verbose(
    `[Cache] Checking PR archives for ${unmatchedMainShas.length} recent main commit(s) without commit archives...`
  );

  const results = await Promise.all(
    unmatchedMainShas.map(async (mainSha): Promise<BestGcsArchive | undefined> => {
      const prNumber = await extractPrNumberFromCommitMessage(mainSha);
      if (!prNumber) return undefined;

      const [tipSha, prBuildFileHashes, projectGraphDiff] = await Promise.all([
        gcsFs.getPrArchiveTipSha(prNumber),
        gcsFs.getPrArchiveFileHashes(prNumber),
        getProjectGraphDiff(mainSha), // fast local git diff — runs in parallel with GCS calls
      ]);
      if (!tipSha) return undefined;

      log.verbose(
        `[Cache] PR archive found for main commit ${mainSha.slice(0, 12)} (PR #${prNumber})` +
          (projectGraphDiff.added.length > 0
            ? ` — ${projectGraphDiff.added.length} package(s) added to graph since built`
            : '')
      );

      return { sha: mainSha, prNumber, prTipSha: tipSha, prBuildFileHashes, projectGraphDiff };
    })
  );

  return results.filter((r): r is BestGcsArchive => r !== undefined);
}

/**
 * Fetches upstream, lists available GCS archive SHAs, and returns the subset
 * of local git candidates that have a matching archive — ordered most to least
 * recent. Shared by resolveBestGcsSha and the full-discovery restore path so
 * the matching logic stays in one place.
 */
export async function resolveGcsMatchedShas(
  log: SomeDevLog,
  gcsFs: GcsFileSystem,
  currentSha: string | undefined,
  history: string[],
  upstreamRemote: string | undefined,
  /** Pre-resolved cache server availability. When omitted (full-discovery / CI path),
   *  the check runs in parallel with the GCS listing inside this function. */
  knownCacheServerAvailable?: boolean
): Promise<string[]> {
  const fetchUpstream = upstreamRemote
    ? execa('git', ['fetch', upstreamRemote, 'main', '--quiet'], { cwd: REPO_ROOT })
        .then(() => log.verbose(`Fetched latest main from ${upstreamRemote}.`))
        .catch((err: unknown) => {
          log.warning(
            `Failed to fetch ${upstreamRemote}/main: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        })
    : Promise.resolve();

  const cacheServerAvailablePromise =
    knownCacheServerAvailable !== undefined
      ? Promise.resolve(knownCacheServerAvailable)
      : isCacheServerAvailable();

  const [{ shas: availableShas, elapsedMs }, , cacheServerAvailable] = await Promise.all([
    gcsFs.listAvailableCommitShas(),
    fetchUpstream,
    cacheServerAvailablePromise,
  ]);

  if (availableShas.size === 0) {
    log.warning('[Cache] GCS returned 0 archives. The bucket may be temporarily unavailable.');
  } else {
    const listMsg = `[Cache] Listed ${availableShas.size} available archive(s) from GCS via API (${elapsedMs}ms)`;

    if (cacheServerAvailable) {
      log.verbose(listMsg);
    } else {
      log.info(listMsg);
    }
  }

  // Read recent main-branch commits to supplement the local rev-list. This
  // helps on branches that haven't merged main recently and whose local history
  // might not reach far enough back to overlap with available GCS archives.
  //
  // IMPORTANT: only include main commits that are already reachable from HEAD
  // (i.e. present in `history`). After a `git merge upstream/main`, upstream
  // advances past our merge point, so `upstream/main` contains commits our
  // branch doesn't include yet. Using those future commits as restore candidates
  // would select an archive built from code we don't have locally, making every
  // project that changed between our HEAD and that future commit appear stale.
  const rawMainShas = upstreamRemote
    ? await readMainBranchCommitShas(MAX_COMMITS_TO_CHECK, upstreamRemote)
    : [];

  const historySet = new Set(history);
  const mainShas = rawMainShas.filter((sha) => historySet.has(sha));

  const candidates = buildCandidateShaList(currentSha, [...history, ...mainShas]);
  const matched = candidates.filter((sha) => availableShas.has(sha));

  if (matched.length === 0 && candidates.length > 0 && availableShas.size > 0) {
    log.info(
      `[Cache] None of the ${candidates.length} candidate commit(s) matched ` +
        `the ${availableShas.size} archived commit(s) in GCS.`
    );
  }

  return matched;
}

/**
 * The two archive candidates that can be compared to find the cheapest restore.
 * The caller computes source staleness for each and uses `estimatedTotalRebuildCount`
 * (+ PR_OVERHEAD for the PR candidate) to pick the winner.
 */
export interface GcsArchiveCandidates {
  /** Best commit archive available (from on_merge CI). Preferred when it exists
   *  because it is always built from the final squash-merge state. */
  commitArchive?: BestGcsArchive;
  /** Best PR archive for a main commit whose on_merge CI hasn't finished yet.
   *  Only present when it represents a more recent state than the commit archive. */
  prArchive?: BestGcsArchive;
}

/**
 * Finds the best available GCS archive candidates for the current checkout.
 * Returns both the best commit archive and the best PR archive (when one is
 * more recent than the commit archive) so the caller can compare their actual
 * estimated rebuild costs and pick the winner.
 *
 * @param knownCurrentSha When provided, skips the `git rev-parse HEAD` call to
 *   avoid resolving the current SHA twice when the caller already has it.
 * @param knownCacheServerAvailable Pre-resolved cache server availability so the
 *   check is not repeated inside resolveGcsMatchedShas.
 */
export async function resolveBestGcsSha(
  log: SomeDevLog,
  gcsFs: GcsFileSystem,
  knownCurrentSha?: string,
  knownCacheServerAvailable?: boolean
): Promise<GcsArchiveCandidates> {
  const upstreamRemote = await resolveUpstreamRemote();
  const [currentSha, history] = await Promise.all([
    knownCurrentSha !== undefined ? Promise.resolve(knownCurrentSha) : resolveCurrentCommitSha(),
    readRecentCommitShas(MAX_COMMITS_TO_CHECK),
  ]);
  const commitMatched = await resolveGcsMatchedShas(
    log,
    gcsFs,
    currentSha,
    history,
    upstreamRemote,
    knownCacheServerAvailable
  );

  // For main commits that have no commit archive yet (on_merge CI still in
  // progress), check whether a PR archive exists. Use mainShas position (index
  // 0 = most recent on main) to determine recency — NOT candidates position,
  // because main commits that aren't local ancestors are appended after the
  // local history section in candidates, giving them artificially high indices.
  //
  // Only include main commits that are actual ancestors of HEAD (present in
  // the local rev-list). After a `git merge upstream/main`, upstream/main
  // advances past our merge point — using future main commits would select PR
  // archives built from code our branch doesn't have, making many projects
  // appear stale. The same filter is applied in resolveGcsMatchedShas.
  const rawMainShas = upstreamRemote
    ? await readMainBranchCommitShas(MAX_COMMITS_TO_CHECK, upstreamRemote)
    : [];
  const historySet = new Set(history);
  const mainShas = rawMainShas.filter((sha) => historySet.has(sha));

  // Find the position of the best commit match within upstream/main. If it is
  // not on main (e.g. a local commit), fall back to checking all main commits.
  const bestCommitMainIdx = commitMatched.length > 0 ? mainShas.indexOf(commitMatched[0]) : -1;

  // Slice the main commits that are more recent than the best commit match.
  // mainShas[0] is the most recent, so indices 0..bestCommitMainIdx-1 are newer.
  const candidateMainShas =
    bestCommitMainIdx >= 0 ? mainShas.slice(0, bestCommitMainIdx) : mainShas;

  const unmatchedMainBefore = candidateMainShas.filter((sha) => !commitMatched.includes(sha));

  let prArchive: BestGcsArchive | undefined;

  if (unmatchedMainBefore.length > 0) {
    const prFallbacks = await resolvePrFallbackMatches(
      log,
      gcsFs,
      unmatchedMainBefore.slice(0, 10)
    );

    if (prFallbacks.length > 0) {
      // Among PR candidates, pick the one with the lowest estimated rebuild cost
      // (recency + project-graph staleness). The PR_OVERHEAD comparison against
      // the commit archive happens in the caller, which has access to tsProjects
      // for accurate source-staleness computation.
      const bestPr = prFallbacks.reduce((best, curr) => {
        const bestIdx = mainShas.indexOf(best.sha);
        const currIdx = mainShas.indexOf(curr.sha);
        const bestCost = bestIdx + (best.projectGraphDiff?.added.length ?? 0) * STALENESS_WEIGHT;
        const currCost = currIdx + (curr.projectGraphDiff?.added.length ?? 0) * STALENESS_WEIGHT;
        return currCost < bestCost ? curr : best;
      });
      // Carry the commit archive as fallback for yarn.lock invalidation checks.
      prArchive =
        commitMatched.length > 0 ? { ...bestPr, fallbackCommitSha: commitMatched[0] } : bestPr;
    }
  }

  return {
    commitArchive: commitMatched.length > 0 ? { sha: commitMatched[0] } : undefined,
    prArchive,
  };
}

/**
 * Estimates how many projects tsc will rebuild after restoring from the given
 * archive — shown to the user in the "N projects to rebuild" display.
 *
 * Returns the count of DIRECTLY stale projects (source files changed between
 * the archive SHA and HEAD). We intentionally do NOT expand to transitive
 * dependents here, because TypeScript only propagates rebuilds when the
 * exported API (.d.ts) changes. Most commits change implementation, not public
 * types, so the transitive closure is a large overcount in practice.
 *
 * The Phase-3 restoration DECISION uses a separate transitive-closure
 * computation (inline in resolveRestoreStrategy) — this function is only for
 * the user-visible estimate.
 *
 * Returns undefined if the staleness check fails (e.g. SHA not in local history).
 */
export async function computeEffectiveRebuildCountFromSha(
  archiveSha: string,
  tsProjects: TsProject[]
): Promise<number | undefined> {
  try {
    const stale = await detectStaleArtifacts({
      fromCommit: archiveSha,
      toCommit: 'HEAD',
      sourceConfigPaths: tsProjects.map((p) => p.path),
    });
    return stale.size;
  } catch {
    return undefined;
  }
}

/**
 * Logs a notice when the best available GCS archive is not for HEAD, which
 * typically means CI hasn't published an archive for the current commit yet.
 * Includes how many commits separate HEAD from the archive and, when the
 * effective rebuild count is known, how many projects tsc will need to rebuild
 * after the restore.
 * Emitted at most once per restore decision — only when the SHAs differ.
 * For PR archives the message names the PR so the user knows where the archive came from.
 */
export async function logArchiveFallback(
  log: SomeDevLog,
  currentSha: string | undefined,
  archive: BestGcsArchive,
  effectiveRebuildCount?: number
): Promise<void> {
  if (!currentSha || archive.sha === currentSha) {
    return;
  }

  const details: string[] = [];

  try {
    const { stdout } = await execa('git', ['rev-list', '--count', `${archive.sha}..HEAD`], {
      cwd: REPO_ROOT,
    });
    const count = parseInt(stdout.trim(), 10);
    if (!isNaN(count)) {
      details.push(`${count} commit${count === 1 ? '' : 's'} behind HEAD`);
    }
  } catch {
    // Non-fatal — omit the commit count if git fails.
  }

  if (effectiveRebuildCount !== undefined) {
    details.push(
      `${effectiveRebuildCount} project${effectiveRebuildCount === 1 ? '' : 's'} to rebuild`
    );
  }

  const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';

  const archiveLabel = archive.prNumber
    ? `PR #${archive.prNumber} archive (${archive.sha.slice(0, 12)})`
    : `nearest ancestor (${archive.sha.slice(0, 12)})`;

  log.info(
    `[Cache check] No GCS archive for HEAD (${currentSha.slice(0, 12)}) — ` +
      `restoring from ${archiveLabel}${suffix}.`
  );

  if (archive.prNumber) {
    const { added = [], removed = [] } = archive.projectGraphDiff ?? {};

    if (added.length > 0 || removed.length > 0) {
      // Specific staleness: packages were added/removed after the PR was built.
      const stalenessParts: string[] = [];
      if (added.length > 0)
        stalenessParts.push(`${added.length} package${added.length === 1 ? '' : 's'} added`);
      if (removed.length > 0)
        stalenessParts.push(`${removed.length} package${removed.length === 1 ? '' : 's'} removed`);
      log.warning(
        `[Cache] PR archive has a stale project graph (${stalenessParts.join(
          ', '
        )} since it was built). ` +
          `Expect ~${
            added.length * STALENESS_WEIGHT
          }+ extra rebuilds for packages not in the archive.`
      );
      if (added.length > 0) {
        log.verbose(`[Cache] New packages not in PR archive: ${added.join(', ')}`);
      }
    } else {
      log.info(
        `[Cache] Using PR archive (on_merge CI hasn't finished yet). ` +
          `Rebuilds will be fast once the commit archive is available.`
      );
    }
  }
}

/**
 * Returns the best archive that is safe to restore given the current node_modules.
 * First checks the primary archive; if its yarn.lock (or other invalidation file)
 * differs from HEAD, falls back to `archive.fallbackCommitSha` when present.
 * Returns undefined if no safe archive can be found (both are invalidated or absent).
 */
export async function resolveNonInvalidatedArchive(
  archive: BestGcsArchive,
  log: SomeDevLog
): Promise<BestGcsArchive | undefined> {
  if (!(await archiveInvalidatedByNodeModulesChange(archive, log))) {
    return archive;
  }
  if (archive.fallbackCommitSha) {
    const fallback: BestGcsArchive = { sha: archive.fallbackCommitSha };
    if (!(await archiveInvalidatedByNodeModulesChange(fallback, log))) {
      return fallback;
    }
  }
  return undefined;
}

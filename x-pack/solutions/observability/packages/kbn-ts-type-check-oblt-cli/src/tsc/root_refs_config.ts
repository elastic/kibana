/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import dedent from 'dedent';
import normalize from 'normalize-path';
import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import { TS_PROJECTS } from '@kbn/ts-projects';

export const ROOT_REFS_CONFIG_PATH = Path.resolve(REPO_ROOT, 'tsconfig.refs.json');
export const REF_CONFIG_PATHS = [ROOT_REFS_CONFIG_PATH];

async function isRootRefsConfigSelfManaged() {
  try {
    const currentRefsFile = await Fsp.readFile(ROOT_REFS_CONFIG_PATH, 'utf-8');
    return currentRefsFile.trim().startsWith('// SELF MANAGED');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function generateTsConfig(refs: string[]) {
  return dedent`
    // This file is automatically updated when you run \`node scripts/type_check\`.
    {
      "include": [],
      "references": [
${refs.map((p) => `        { "path": ${JSON.stringify(p)} },`).join('\n')}
      ]
    }
  `;
}

/**
 * Get repo-relative paths of files changed in the working tree
 * (staged, unstaged, and untracked .ts/.tsx files).
 */
export async function getChangedFiles(): Promise<Set<string>> {
  try {
    const { stdout } = await execa('git', ['diff', '--name-only', 'HEAD', '--diff-filter=ACMR'], {
      cwd: REPO_ROOT,
    });
    return new Set(
      stdout
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
    );
  } catch {
    return new Set();
  }
}

/**
 * Map changed files to the set of project config paths that contain them.
 * Uses the deepest matching project directory for each file.
 */
export function getAffectedProjectRefs(changedFiles: Set<string>, refs: string[]): Set<string> {
  const projectDirs = refs.map((ref) => ({
    ref,
    dir: normalize(Path.dirname(ref.replace(/^\.\//, ''))),
  }));

  const affected = new Set<string>();
  for (const file of changedFiles) {
    let bestMatch = '';
    let bestRef = '';
    for (const { ref, dir } of projectDirs) {
      if (file.startsWith(dir + '/') && dir.length > bestMatch.length) {
        bestMatch = dir;
        bestRef = ref;
      }
    }
    if (bestRef) {
      affected.add(bestRef);
    }
  }
  return affected;
}

export async function updateRootRefsConfig(log: ToolingLog) {
  if (await isRootRefsConfigSelfManaged()) {
    throw createFailError(
      `tsconfig.refs.json starts with "// SELF MANAGED" but we removed this functinality because of some complexity it caused with TS performance upgrades and we were pretty sure that nobody was using it. Please reach out to operations to discuss options <3`
    );
  }

  const refs = TS_PROJECTS.flatMap((p) => {
    if (p.isTypeCheckDisabled()) {
      return [];
    }

    return `./${normalize(Path.relative(REPO_ROOT, p.typeCheckConfigPath))}`;
  }).sort((a, b) => a.localeCompare(b));

  log.debug('updating', ROOT_REFS_CONFIG_PATH);
  // eslint-disable-next-line @kbn/eslint/require_kbn_fs
  await Fsp.writeFile(ROOT_REFS_CONFIG_PATH, generateTsConfig(refs) + '\n', 'utf8');
}

export async function cleanupRootRefsConfig() {
  try {
    await Fsp.unlink(ROOT_REFS_CONFIG_PATH);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

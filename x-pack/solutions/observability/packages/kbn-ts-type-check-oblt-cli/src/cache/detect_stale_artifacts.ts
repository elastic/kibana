/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';

export interface Project {
  /** Absolute path to this project's tsconfig.type_check.json. */
  tsConfigPath: string;
  /** Absolute path to the project's root directory. */
  dir: string;
}

/**
 * Runs `git diff --name-only <fromCommit> <toCommit>` and returns the
 * absolute paths of all files that changed between the two commits.
 */
export const getChangedFiles = async (
  repoRoot: string,
  fromCommit: string,
  toCommit: string
): Promise<string[]> => {
  const { stdout } = await execa('git', ['diff', '--name-only', fromCommit, toCommit], {
    cwd: repoRoot,
  });

  return stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((rel) => Path.resolve(repoRoot, rel));
};

/**
 * Converts an explicit list of source tsconfig paths (relative to repoRoot,
 * e.g. from packages/kbn-ts-projects/config-paths.json) into Project objects.
 *
 * Each project's tsConfigPath is the derived tsconfig.type_check.json path,
 * which is what tsc uses for the incremental composite build.
 */
export const discoverProjects = (repoRoot: string, sourceConfigPaths: string[]): Project[] =>
  sourceConfigPaths.map((rel) => {
    const dir = Path.resolve(repoRoot, Path.dirname(rel));
    return { tsConfigPath: Path.join(dir, 'tsconfig.type_check.json'), dir };
  });

/**
 * Returns the set of tsconfig.type_check.json paths for projects that own at
 * least one of the given changed files, using directory-prefix matching.
 *
 * When a file could belong to multiple nested projects (e.g. a package with a
 * nested sub-package), the most specific (longest directory path) match wins.
 */
export const mapFilesToProjects = (changedFiles: string[], projects: Project[]): Set<string> => {
  const directly = new Set<string>();
  // Descending sort by dir length ensures the most specific project wins.
  const sorted = [...projects].sort((a, b) => b.dir.length - a.dir.length);

  for (const file of changedFiles) {
    for (const project of sorted) {
      if (file.startsWith(project.dir + Path.sep) || file === project.dir) {
        directly.add(project.tsConfigPath);
        break;
      }
    }
  }

  return directly;
};

/**
 * Returns the set of tsconfig.type_check.json paths for projects that own at
 * least one file changed between fromCommit and toCommit.
 *
 * Returns only the *directly* changed projects — transitive dependents are not
 * included here. Callers that need the full effective rebuild set (e.g.
 * resolveRestoreStrategy) should follow up with computeEffectiveRebuildSet
 * using the in-memory TsProject dependency graph from @kbn/ts-projects.
 */
export const detectStaleArtifacts = async ({
  fromCommit,
  toCommit,
  sourceConfigPaths,
}: {
  fromCommit: string;
  toCommit: string;
  sourceConfigPaths: string[];
}): Promise<Set<string>> => {
  const projects = discoverProjects(REPO_ROOT, sourceConfigPaths);
  const changedFiles = await getChangedFiles(REPO_ROOT, fromCommit, toCommit);
  return mapFilesToProjects(changedFiles, projects);
};

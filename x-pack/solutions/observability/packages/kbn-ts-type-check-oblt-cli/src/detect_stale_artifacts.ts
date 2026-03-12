/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import execa from 'execa';
import { asyncForEachWithLimit } from '@kbn/std';
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
 * Reads a tsconfig file (stripping single-line and block comments), parses
 * JSON, and returns the absolute paths of its `references[].path` entries.
 *
 * Returns [] if the file does not exist, cannot be read, or has no references.
 * Appends /tsconfig.json when a reference path points to a directory rather
 * than a .json file (standard TypeScript project-references convention).
 */
export const getReferences = async (tsConfigPath: string): Promise<string[]> => {
  let raw: string;
  try {
    raw = await Fsp.readFile(tsConfigPath, 'utf8');
  } catch {
    return [];
  }

  const stripped = raw
    .replace(/\/\/[^\n]*/g, '') // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments

  let parsed: { references?: Array<{ path?: string }> };
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed.references)) {
    return [];
  }

  const dir = Path.dirname(tsConfigPath);
  return parsed.references
    .map((ref) => ref.path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .map((p) => {
      const resolved = Path.resolve(dir, p);
      return resolved.endsWith('.json') ? resolved : Path.join(resolved, 'tsconfig.json');
    });
};

/**
 * Builds the reverse-dependency (dependents) graph. For each tsconfig path
 * the map value is the set of projects that directly depend on it.
 *
 * Reads each project's tsconfig.type_check.json for its `references` entries.
 * Projects whose type_check config does not yet exist are treated as having
 * no dependencies (getReferences returns [] on ENOENT).
 */
export const buildDependentsGraph = async (
  projects: Project[]
): Promise<Map<string, Set<string>>> => {
  const graph = new Map<string, Set<string>>();

  for (const { tsConfigPath } of projects) {
    graph.set(tsConfigPath, new Set());
  }

  await asyncForEachWithLimit(projects, 50, async ({ tsConfigPath }) => {
    const refs = await getReferences(tsConfigPath);
    for (const ref of refs) {
      if (!graph.has(ref)) {
        graph.set(ref, new Set());
      }
      graph.get(ref)!.add(tsConfigPath);
    }
  });

  return graph;
};

/**
 * Returns the set of tsconfig.type_check.json paths for projects that own at
 * least one of the given changed files, using directory-prefix matching.
 *
 * When a file could belong to multiple nested projects (e.g. a package with a
 * nested sub-package), the most specific (longest directory path) match wins.
 */
export const mapFilesToProjects = (changedFiles: string[], projects: Project[]): Set<string> => {
  const stale = new Set<string>();
  // Descending sort by dir length ensures the most specific project wins.
  const sorted = [...projects].sort((a, b) => b.dir.length - a.dir.length);

  for (const file of changedFiles) {
    for (const project of sorted) {
      if (file.startsWith(project.dir + Path.sep) || file === project.dir) {
        stale.add(project.tsConfigPath);
        break;
      }
    }
  }

  return stale;
};

/**
 * BFS traversal upward through the dependents graph starting from the
 * directly affected projects. Returns every transitively stale project path,
 * including the starting set. The visited set prevents infinite loops on cycles.
 */
export const findTransitiveDependents = (
  directlyAffected: Set<string>,
  dependentsGraph: Map<string, Set<string>>
): Set<string> => {
  const stale = new Set<string>(directlyAffected);
  const queue = [...directlyAffected];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of dependentsGraph.get(current) ?? []) {
      if (!stale.has(dependent)) {
        stale.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return stale;
};

/**
 * Returns the set of tsconfig.type_check.json paths whose build artifacts
 * will be stale when the repository transitions from fromCommit to toCommit.
 *
 * Combines all steps: git diff → project mapping → dependency graph traversal.
 * Runs the git diff and graph construction in parallel since they are independent.
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

  const [changedFiles, dependentsGraph] = await Promise.all([
    getChangedFiles(REPO_ROOT, fromCommit, toCommit),
    buildDependentsGraph(projects),
  ]);

  const directlyAffected = mapFilesToProjects(changedFiles, projects);

  return findTransitiveDependents(directlyAffected, dependentsGraph);
};

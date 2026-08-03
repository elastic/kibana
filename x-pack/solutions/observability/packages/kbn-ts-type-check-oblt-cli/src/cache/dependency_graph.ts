/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TsProject } from '@kbn/ts-projects';

/** Maps each project's typeCheckConfigPath to the set of its direct dependency typeCheckConfigPaths. */
export function buildForwardDependencyMap(tsProjects: TsProject[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const p of tsProjects) {
    map.set(
      p.typeCheckConfigPath,
      new Set(p.getKbnRefs(tsProjects).map((dep) => dep.typeCheckConfigPath))
    );
  }
  return map;
}

export function buildReverseDependencyMap(tsProjects: TsProject[]): Map<string, Set<string>> {
  const reverseDeps = new Map<string, Set<string>>();

  for (const project of tsProjects) {
    for (const dep of project.getKbnRefs(tsProjects)) {
      const depPath = dep.typeCheckConfigPath;

      if (!reverseDeps.has(depPath)) {
        reverseDeps.set(depPath, new Set());
      }

      reverseDeps.get(depPath)!.add(project.typeCheckConfigPath);
    }
  }

  return reverseDeps;
}

/**
 * Computes the union of directly stale projects and all their transitive
 * dependents via BFS over the reverse dependency graph. This is the true
 * number of projects tsc would need to recheck if the stale artifacts are
 * used as-is.
 */
export function computeEffectiveRebuildSet(
  stale: Set<string>,
  reverseDeps: Map<string, Set<string>>
): Set<string> {
  const result = new Set(stale);
  const queue = [...stale];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const dependent of reverseDeps.get(current) ?? []) {
      if (!result.has(dependent)) {
        result.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return result;
}

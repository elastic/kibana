/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import execa from 'execa';

import {
  getChangedFiles,
  discoverProjects,
  getReferences,
  buildDependentsGraph,
  mapFilesToProjects,
  findTransitiveDependents,
  detectStaleArtifacts,
} from './detect_stale_artifacts';

jest.mock('execa');
jest.mock('fs/promises');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));

// ── Synthetic project graph ───────────────────────────────────────────────────
//
//   core  ←  utils  ←  plugin-a  ←  enterprise
//                    ←  plugin-b  ←
//
// "←" means "is a dependency of" (right side depends on left side).
// Rebuilding `core` cascades to all five projects.
// Rebuilding `plugin-a` cascades only to `enterprise`.

const REPO = '/repo';

const tsc = (...parts: string[]) => Path.join(REPO, ...parts, 'tsconfig.type_check.json');
const dir = (...parts: string[]) => Path.join(REPO, ...parts);
const file = (...parts: string[]) => Path.join(REPO, ...parts);

const PROJECTS = [
  { tsConfigPath: tsc('packages/core'), dir: dir('packages/core') },
  { tsConfigPath: tsc('packages/utils'), dir: dir('packages/utils') },
  { tsConfigPath: tsc('packages/plugin-a'), dir: dir('packages/plugin-a') },
  { tsConfigPath: tsc('packages/plugin-b'), dir: dir('packages/plugin-b') },
  { tsConfigPath: tsc('x-pack/enterprise'), dir: dir('x-pack/enterprise') },
];

/**
 * Builds the expected dependents graph for the synthetic project graph above.
 * This is the reverse of the dependency direction:
 *   core     → {utils}
 *   utils    → {plugin-a, plugin-b}
 *   plugin-a → {enterprise}
 *   plugin-b → {enterprise}
 *   enterprise → {}
 */
const buildSyntheticGraph = (): Map<string, Set<string>> =>
  new Map([
    [tsc('packages/core'), new Set([tsc('packages/utils')])],
    [tsc('packages/utils'), new Set([tsc('packages/plugin-a'), tsc('packages/plugin-b')])],
    [tsc('packages/plugin-a'), new Set([tsc('x-pack/enterprise')])],
    [tsc('packages/plugin-b'), new Set([tsc('x-pack/enterprise')])],
    [tsc('x-pack/enterprise'), new Set<string>()],
  ]);

const mockExeca = execa as unknown as jest.Mock;
const mockReadFile = Fsp.readFile as jest.Mock;

// ── getChangedFiles ───────────────────────────────────────────────────────────

describe('getChangedFiles', () => {
  it('returns absolute paths of changed files', async () => {
    mockExeca.mockResolvedValue({
      stdout: 'packages/core/src/index.ts\npackages/utils/index.ts\n',
    });

    const result = await getChangedFiles(REPO, 'abc123', 'def456');

    expect(result).toEqual([file('packages/core/src/index.ts'), file('packages/utils/index.ts')]);
    expect(mockExeca).toHaveBeenCalledWith('git', ['diff', '--name-only', 'abc123', 'def456'], {
      cwd: REPO,
    });
  });

  it('returns an empty array when no files changed', async () => {
    mockExeca.mockResolvedValue({ stdout: '' });

    expect(await getChangedFiles(REPO, 'abc123', 'def456')).toEqual([]);
  });

  it('trims whitespace and filters empty lines', async () => {
    mockExeca.mockResolvedValue({ stdout: '\n  packages/core/index.ts  \n\n' });

    expect(await getChangedFiles(REPO, 'abc123', 'def456')).toEqual([
      file('packages/core/index.ts'),
    ]);
  });
});

// ── discoverProjects ──────────────────────────────────────────────────────────

describe('discoverProjects', () => {
  it('converts source tsconfig paths to Project objects with type_check paths', () => {
    const result = discoverProjects(REPO, [
      'packages/core/tsconfig.json',
      'x-pack/enterprise/tsconfig.json',
    ]);

    expect(result).toEqual([
      { tsConfigPath: tsc('packages/core'), dir: dir('packages/core') },
      { tsConfigPath: tsc('x-pack/enterprise'), dir: dir('x-pack/enterprise') },
    ]);
  });

  it('returns an empty array for an empty input list', () => {
    expect(discoverProjects(REPO, [])).toEqual([]);
  });
});

// ── getReferences ─────────────────────────────────────────────────────────────

describe('getReferences', () => {
  beforeEach(() => mockReadFile.mockReset());

  it('returns absolute paths of referenced tsconfig files', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        references: [
          { path: '../core/tsconfig.type_check.json' },
          { path: '../utils/tsconfig.type_check.json' },
        ],
      })
    );

    expect(await getReferences(tsc('packages/plugin-a'))).toEqual([
      tsc('packages/core'),
      tsc('packages/utils'),
    ]);
  });

  it('appends /tsconfig.json when a reference path points to a directory', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ references: [{ path: '../core' }] }));

    expect(await getReferences(tsc('packages/plugin-a'))).toEqual([
      Path.join(dir('packages/core'), 'tsconfig.json'),
    ]);
  });

  it('strips single-line and block comments before parsing', async () => {
    mockReadFile.mockResolvedValue(`{
      // single-line comment
      "references": [
        /* block comment */
        { "path": "../core/tsconfig.type_check.json" }
      ]
    }`);

    expect(await getReferences(tsc('packages/plugin-a'))).toEqual([tsc('packages/core')]);
  });

  it('returns [] when the file does not exist', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    expect(await getReferences(tsc('packages/missing'))).toEqual([]);
  });

  it('returns [] when the tsconfig has no references field', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ compilerOptions: {} }));

    expect(await getReferences(tsc('packages/core'))).toEqual([]);
  });

  it('returns [] when the file contains invalid JSON', async () => {
    mockReadFile.mockResolvedValue('{ not: valid json {{');

    expect(await getReferences(tsc('packages/core'))).toEqual([]);
  });
});

// ── mapFilesToProjects ────────────────────────────────────────────────────────

describe('mapFilesToProjects', () => {
  it('maps a changed file to the owning project', () => {
    expect(mapFilesToProjects([file('packages/core/src/index.ts')], PROJECTS)).toEqual(
      new Set([tsc('packages/core')])
    );
  });

  it('maps files in multiple projects simultaneously', () => {
    expect(
      mapFilesToProjects(
        [file('packages/core/index.ts'), file('packages/plugin-a/src/plugin.ts')],
        PROJECTS
      )
    ).toEqual(new Set([tsc('packages/core'), tsc('packages/plugin-a')]));
  });

  it('ignores files that do not belong to any project', () => {
    expect(
      mapFilesToProjects([file('scripts/some_script.ts'), file('unknown/file.ts')], PROJECTS)
    ).toEqual(new Set());
  });

  it('uses the most specific (longest) directory match for nested projects', () => {
    const nested = [
      { tsConfigPath: tsc('packages/core'), dir: dir('packages/core') },
      { tsConfigPath: tsc('packages/core/sub'), dir: dir('packages/core/sub') },
    ];

    // File inside the sub-package should match the sub-package, not the parent.
    expect(mapFilesToProjects([file('packages/core/sub/index.ts')], nested)).toEqual(
      new Set([tsc('packages/core/sub')])
    );
  });

  it('does not match a file whose parent directory is only a name-prefix of the project dir', () => {
    // packages/core-extra should NOT match packages/core
    expect(mapFilesToProjects([file('packages/core-extra/index.ts')], PROJECTS)).toEqual(new Set());
  });
});

// ── findTransitiveDependents ──────────────────────────────────────────────────

describe('findTransitiveDependents', () => {
  it('includes the directly affected project itself', () => {
    const graph = buildSyntheticGraph();
    const result = findTransitiveDependents(new Set([tsc('x-pack/enterprise')]), graph);

    expect(result).toEqual(new Set([tsc('x-pack/enterprise')]));
  });

  it('returns all transitive dependents when a shared root dependency changes', () => {
    const graph = buildSyntheticGraph();
    const result = findTransitiveDependents(new Set([tsc('packages/core')]), graph);

    expect(result).toEqual(
      new Set([
        tsc('packages/core'),
        tsc('packages/utils'),
        tsc('packages/plugin-a'),
        tsc('packages/plugin-b'),
        tsc('x-pack/enterprise'),
      ])
    );
  });

  it('returns only the affected subtree for an intermediate project change', () => {
    const graph = buildSyntheticGraph();
    const result = findTransitiveDependents(new Set([tsc('packages/plugin-a')]), graph);

    expect(result).toEqual(new Set([tsc('packages/plugin-a'), tsc('x-pack/enterprise')]));
  });

  it('returns an empty set when the input is empty', () => {
    expect(findTransitiveDependents(new Set(), buildSyntheticGraph())).toEqual(new Set());
  });

  it('does not loop infinitely on circular references', () => {
    const cycleX = tsc('packages/cycle-x');
    const cycleY = tsc('packages/cycle-y');

    const graph = new Map([
      [cycleX, new Set([cycleY])],
      [cycleY, new Set([cycleX])],
    ]);

    const result = findTransitiveDependents(new Set([cycleX]), graph);

    expect(result).toEqual(new Set([cycleX, cycleY]));
  });

  it('handles a project not present in the graph without throwing', () => {
    const graph = buildSyntheticGraph();
    const unknown = tsc('packages/unknown');

    // Should not throw — the graph simply has no entry for the unknown project.
    expect(findTransitiveDependents(new Set([unknown]), graph)).toEqual(new Set([unknown]));
  });
});

// ── buildDependentsGraph ──────────────────────────────────────────────────────

describe('buildDependentsGraph', () => {
  const THREE_PROJECTS = PROJECTS.slice(0, 3); // core, utils, plugin-a

  beforeEach(() => {
    mockReadFile.mockReset();
    mockReadFile.mockImplementation(async (path: string) => {
      if (path === tsc('packages/core')) {
        return '{}';
      }
      if (path === tsc('packages/utils')) {
        return JSON.stringify({
          references: [{ path: '../core/tsconfig.type_check.json' }],
        });
      }
      if (path === tsc('packages/plugin-a')) {
        return JSON.stringify({
          references: [{ path: '../utils/tsconfig.type_check.json' }],
        });
      }
      throw Object.assign(new Error(`ENOENT: no such file: ${path}`), { code: 'ENOENT' });
    });
  });

  it('builds the correct reverse-dependency (dependents) map', async () => {
    const graph = await buildDependentsGraph(THREE_PROJECTS);

    expect(graph.get(tsc('packages/core'))).toEqual(new Set([tsc('packages/utils')]));
    expect(graph.get(tsc('packages/utils'))).toEqual(new Set([tsc('packages/plugin-a')]));
    expect(graph.get(tsc('packages/plugin-a'))).toEqual(new Set());
  });

  it('initialises every known project in the graph even if it has no dependents', async () => {
    const graph = await buildDependentsGraph(THREE_PROJECTS);

    for (const { tsConfigPath } of THREE_PROJECTS) {
      expect(graph.has(tsConfigPath)).toBe(true);
    }
  });

  it('treats a missing type_check config as having no references', async () => {
    // All files throw ENOENT
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const graph = await buildDependentsGraph(THREE_PROJECTS);

    // Graph is initialised but has no edges
    for (const { tsConfigPath } of THREE_PROJECTS) {
      expect(graph.get(tsConfigPath)).toEqual(new Set());
    }
  });
});

// ── detectStaleArtifacts (integration) ───────────────────────────────────────

describe('detectStaleArtifacts', () => {
  const SOURCE_PATHS = [
    'packages/core/tsconfig.json',
    'packages/utils/tsconfig.json',
    'packages/plugin-a/tsconfig.json',
  ];

  beforeEach(() => {
    mockReadFile.mockReset();
    mockExeca.mockReset();

    mockReadFile.mockImplementation(async (path: string) => {
      if (path === tsc('packages/core')) return '{}';
      if (path === tsc('packages/utils')) {
        return JSON.stringify({ references: [{ path: '../core/tsconfig.type_check.json' }] });
      }
      if (path === tsc('packages/plugin-a')) {
        return JSON.stringify({ references: [{ path: '../utils/tsconfig.type_check.json' }] });
      }
      throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
    });
  });

  it('returns all transitively stale projects when a root dependency file changes', async () => {
    mockExeca.mockResolvedValue({ stdout: 'packages/core/src/index.ts' });

    const result = await detectStaleArtifacts({
      fromCommit: 'abc123',
      toCommit: 'def456',
      sourceConfigPaths: SOURCE_PATHS,
    });

    expect(result).toEqual(
      new Set([tsc('packages/core'), tsc('packages/utils'), tsc('packages/plugin-a')])
    );
  });

  it('returns only the affected project when a leaf file changes', async () => {
    mockExeca.mockResolvedValue({ stdout: 'packages/plugin-a/src/plugin.ts' });

    const result = await detectStaleArtifacts({
      fromCommit: 'abc123',
      toCommit: 'def456',
      sourceConfigPaths: SOURCE_PATHS,
    });

    expect(result).toEqual(new Set([tsc('packages/plugin-a')]));
  });

  it('returns an empty set when no files changed', async () => {
    mockExeca.mockResolvedValue({ stdout: '' });

    const result = await detectStaleArtifacts({
      fromCommit: 'abc123',
      toCommit: 'def456',
      sourceConfigPaths: SOURCE_PATHS,
    });

    expect(result).toEqual(new Set());
  });

  it('returns an empty set when changed files do not belong to any known project', async () => {
    mockExeca.mockResolvedValue({ stdout: 'scripts/some_tool.ts' });

    const result = await detectStaleArtifacts({
      fromCommit: 'abc123',
      toCommit: 'def456',
      sourceConfigPaths: SOURCE_PATHS,
    });

    expect(result).toEqual(new Set());
  });
});

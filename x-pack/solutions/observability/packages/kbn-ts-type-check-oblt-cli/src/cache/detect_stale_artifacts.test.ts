/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import execa from 'execa';

import {
  getChangedFiles,
  discoverProjects,
  mapFilesToProjects,
  detectStaleArtifacts,
} from './detect_stale_artifacts';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));

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

const mockExeca = execa as unknown as jest.Mock;

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

// ── detectStaleArtifacts ──────────────────────────────────────────────────────

describe('detectStaleArtifacts', () => {
  const SOURCE_PATHS = [
    'packages/core/tsconfig.json',
    'packages/utils/tsconfig.json',
    'packages/plugin-a/tsconfig.json',
  ];

  beforeEach(() => mockExeca.mockReset());

  it('returns directly changed projects only (no BFS expansion)', async () => {
    // core changes — utils and plugin-a depend on it, but are NOT included here;
    // that expansion is handled by computeEffectiveRebuildSet in the caller.
    mockExeca.mockResolvedValue({ stdout: 'packages/core/src/index.ts' });

    const result = await detectStaleArtifacts({
      fromCommit: 'abc123',
      toCommit: 'def456',
      sourceConfigPaths: SOURCE_PATHS,
    });

    expect(result).toEqual(new Set([tsc('packages/core')]));
  });

  it('returns all directly touched projects when files span multiple packages', async () => {
    mockExeca.mockResolvedValue({
      stdout: 'packages/core/src/index.ts\npackages/plugin-a/src/plugin.ts',
    });

    const result = await detectStaleArtifacts({
      fromCommit: 'abc123',
      toCommit: 'def456',
      sourceConfigPaths: SOURCE_PATHS,
    });

    expect(result).toEqual(new Set([tsc('packages/core'), tsc('packages/plugin-a')]));
  });

  it('returns an empty set when no files changed', async () => {
    mockExeca.mockResolvedValue({ stdout: '' });

    expect(
      await detectStaleArtifacts({
        fromCommit: 'abc123',
        toCommit: 'def456',
        sourceConfigPaths: SOURCE_PATHS,
      })
    ).toEqual(new Set());
  });

  it('returns an empty set when changed files do not belong to any known project', async () => {
    mockExeca.mockResolvedValue({ stdout: 'scripts/some_tool.ts' });

    expect(
      await detectStaleArtifacts({
        fromCommit: 'abc123',
        toCommit: 'def456',
        sourceConfigPaths: SOURCE_PATHS,
      })
    ).toEqual(new Set());
  });
});

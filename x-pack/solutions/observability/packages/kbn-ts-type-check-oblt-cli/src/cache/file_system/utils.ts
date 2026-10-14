/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { x as tarExtract } from 'tar';
import type { ReadEntry } from 'tar';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';

/** Restorable entries mirror the archived globs: declaration outputs under target/types and type_check configs. */
const RESTORABLE_ENTRY_PATTERNS = [
  /^(?:[^/]+\/)*target\/types\/(?:[^/]+\/)*[^/]+\.(?:d\.[cm]?ts|d\.ts\.map|tsbuildinfo)$/,
  /^(?:[^/]+\/)*tsconfig[^/]*\.type_check\.json$/,
];
const RESTORABLE_ENTRY_TYPES = new Set(['File', 'OldFile']);
const UNRESTORABLE_PATH_SEGMENTS = new Set(['', '.', '..', 'node_modules', '.git']);

/**
 * Whether a TypeScript cache archive entry is a type-check artifact that may be written into the repo.
 */
export function isRestorableArchiveEntry(entryPath: string, entryType: string): boolean {
  const relativePath = entryPath.replace(/^\.\//, '');
  return (
    RESTORABLE_ENTRY_TYPES.has(entryType) &&
    !relativePath.split('/').some((segment) => UNRESTORABLE_PATH_SEGMENTS.has(segment)) &&
    RESTORABLE_ENTRY_PATTERNS.some((pattern) => pattern.test(relativePath))
  );
}

/**
 * Creates a tar extraction stream into REPO_ROOT that only writes restorable entries.
 */
export function createArchiveExtractor(
  log: SomeDevLog,
  { onentry }: { onentry?: (entry: ReadEntry) => void } = {}
) {
  return tarExtract({
    cwd: REPO_ROOT,
    preserveOwner: false,
    onentry,
    filter: (entryPath, entry) => {
      const entryType = 'type' in entry ? entry.type : '';
      const restorable = isRestorableArchiveEntry(entryPath, entryType);
      if (!restorable && entryType !== 'Directory') {
        log.warning(`Skipping unexpected entry in TypeScript cache archive: ${entryPath}`);
      }
      return restorable;
    },
  });
}

function joinUri(base: string, targetPath: string) {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanTarget = targetPath.replace(/^\/+/, '');
  return `${cleanBase}/${cleanTarget}`;
}

export function join(left: string, ...rights: string[]) {
  const isUri = left.includes('://');
  if (isUri) {
    return rights.reduce((prev, current) => {
      return joinUri(prev, current);
    }, left);
  }
  return Path.join(left, ...rights);
}

const TAR_PLATFORM_OPTIONS =
  process.platform === 'linux'
    ? ['--no-same-owner', '--no-same-permissions', '--numeric-owner', '--delay-directory-restore']
    : [];

export const getTarPlatformOptions = () => TAR_PLATFORM_OPTIONS;

export const getTarCreateArgs = (fileArg: string, fileListPath: string): string[] => [
  '--create',
  '--file',
  fileArg,
  '--gzip',
  '--directory',
  REPO_ROOT,
  '--null',
  '--files-from',
  fileListPath,
];

export const resolveTarEnvironment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // these should speed up archiving on MacOS
    COPYFILE_DISABLE: '1',
    COPY_EXTENDED_ATTRIBUTES_DISABLE: '1',
  };

  return env;
};

export function doHashesMatch({
  currentFileHashes,
  storedFileHashes,
}: {
  currentFileHashes?: Record<string, string | null | undefined>;
  storedFileHashes?: Record<string, string | null | undefined>;
}): { result: boolean; message: string } {
  if (!currentFileHashes || !storedFileHashes) {
    return { result: true, message: 'No file hashes to compare.' };
  }

  const currentHashKeys = Object.keys(currentFileHashes);
  const storedHashKeys = Object.keys(storedFileHashes);
  const allKeys = new Set([...currentHashKeys, ...storedHashKeys]);

  for (const key of allKeys) {
    if (currentFileHashes[key] !== storedFileHashes[key]) {
      return {
        result: false,
        message: `Hash mismatch for file "${key}": current hash is "${currentFileHashes[key]}", stored hash is "${storedFileHashes[key]}"`,
      };
    }
  }
  return { result: true, message: 'All file hashes match.' };
}

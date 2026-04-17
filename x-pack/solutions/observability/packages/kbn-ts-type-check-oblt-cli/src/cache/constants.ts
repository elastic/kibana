/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import Os from 'os';

/**
 * Tracks the commit SHA that the local TypeScript build artifacts currently
 * correspond to. Written after a GCS restore and after each successful tsc run.
 * Stored under /data (already gitignored) so it is per-clone and never committed.
 */
export const ARTIFACTS_STATE_FILE = Path.resolve(
  REPO_ROOT,
  'data',
  'kbn-ts-type-check-oblt-artifacts.sha'
);

export const CACHE_IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '.moon/cache/**',
  '.es/**',
  '.es-data/**',
  'data/**',
  '.ftr/**',
  'build/**',
];

export const GCS_BUCKET_NAME = 'ci-typescript-archives';

export const GCS_BUCKET_PATH = 'ts_type_check';

export const GCS_BUCKET_URI = `gs://${GCS_BUCKET_NAME}/${GCS_BUCKET_PATH}`;

export const COMMITS_PATH = `commits`;
export const PULL_REQUESTS_PATH = `prs`;

const BASE_DIR = Path.resolve(Os.tmpdir(), 'kibana-ts-type-check-cache');

export const TMP_DIR = Path.join(BASE_DIR, 'tmp');
export const LOCAL_CACHE_ROOT = Path.join(BASE_DIR, 'archives');

export const MAX_COMMITS_TO_CHECK = 50;

export const TYPES_DIRECTORY_GLOB = '**/target/types';
export const TYPE_CHECK_CONFIG_GLOB = '**/tsconfig*.type_check.json';

/**
 * Files that should be hashed and checked for cache invalidation.
 * If any of these files change, the cache should be invalidated.
 */
export const CACHE_INVALIDATION_FILES = ['yarn.lock', '.nvmrc', '.node-version'];

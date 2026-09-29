/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockInstance } from 'vitest';

import Fsp from 'fs/promises';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';
import { createTypeCheckConfigs } from './create_type_check_configs';

vi.mock('@kbn/std', () => {
      const mocked = {
      asyncMapWithLimit: vi
        .fn()
        .mockImplementation(
          async <T, R>(items: T[], _limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> =>
            Promise.all(items.map(mapper))
        ),
    };
      return { ...mocked, default: mocked };
    });

const makeProject = (dir: string): TsProject =>
  ({
    path: `${dir}/tsconfig.json`,
    directory: `/repo/${dir}`,
    typeCheckConfigPath: `/repo/${dir}/tsconfig.type_check.json`,
    repoRel: `${dir}/tsconfig.json`,
    config: {},
    getBase: () => undefined,
    getKbnRefs: () => [],
    isTypeCheckDisabled: () => false,
  } as unknown as TsProject);

const makeLog = (): SomeDevLog =>
  ({ verbose: vi.fn(), info: vi.fn() } as unknown as SomeDevLog);

// Content that createTypeCheckConfigs generates for a project with empty config and no refs.
const expectedContent = JSON.stringify(
  {
    compilerOptions: {
      composite: true,
      rootDir: '.',
      noEmit: false,
      emitDeclarationOnly: true,
    },
    references: [],
  },
  null,
  2
);

describe('createTypeCheckConfigs', () => {
  let readFileSpy: MockInstance;
  let writeFileSpy: MockInstance;
  let statSpy: MockInstance;
  let utimesSpy: MockInstance;

  const ARCHIVE_MTIME = new Date('2024-01-01T00:00:00Z');

  beforeEach(() => {
    readFileSpy = vi.spyOn(Fsp, 'readFile');
    writeFileSpy = vi.spyOn(Fsp, 'writeFile').mockResolvedValue(undefined as never);
    statSpy = vi.spyOn(Fsp, 'stat').mockResolvedValue({ mtime: ARCHIVE_MTIME } as never);
    utimesSpy = vi.spyOn(Fsp, 'utimes').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('onlyCreateMissing: false (default) — always keep tsconfigs up-to-date', () => {
    it('creates a file that does not exist yet', async () => {
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      readFileSpy.mockRejectedValue(enoent);

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project]);

      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledWith(
        `/repo/packages/foo/tsconfig.type_check.json`,
        expectedContent,
        'utf8'
      );
    });

    it('overwrites an existing file when the content has changed', async () => {
      readFileSpy.mockResolvedValue('outdated content');

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project]);

      expect(writeFileSpy).toHaveBeenCalledTimes(1);
    });

    it('skips writing when the existing file content is already up-to-date', async () => {
      readFileSpy.mockResolvedValue(expectedContent);

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project]);

      expect(writeFileSpy).not.toHaveBeenCalled();
    });
  });

  describe('onlyCreateMissing: true — preserve tsconfigs restored from archive', () => {
    it('creates a file that does not exist yet', async () => {
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      readFileSpy.mockRejectedValue(enoent);

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project], { onlyCreateMissing: true });

      expect(writeFileSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT overwrite an existing file even when the content has changed', async () => {
      readFileSpy.mockResolvedValue('outdated content');

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project], { onlyCreateMissing: true });

      expect(writeFileSpy).not.toHaveBeenCalled();
    });

    it('does NOT overwrite an existing file that is already up-to-date', async () => {
      readFileSpy.mockResolvedValue(expectedContent);

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project], { onlyCreateMissing: true });

      expect(writeFileSpy).not.toHaveBeenCalled();
    });
  });

  describe('preserveTimestampOnWrite: true — update content but keep mtime stable', () => {
    it('writes changed content but resets mtime to the pre-write value', async () => {
      readFileSpy.mockResolvedValue('outdated content');

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project], {
        preserveTimestampOnWrite: true,
      });

      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      expect(statSpy).toHaveBeenCalledWith(`/repo/packages/foo/tsconfig.type_check.json`);
      expect(utimesSpy).toHaveBeenCalledWith(
        `/repo/packages/foo/tsconfig.type_check.json`,
        ARCHIVE_MTIME,
        ARCHIVE_MTIME
      );
    });

    it('does NOT call utimes when the file content is already up-to-date', async () => {
      readFileSpy.mockResolvedValue(expectedContent);

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project], {
        preserveTimestampOnWrite: true,
      });

      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(utimesSpy).not.toHaveBeenCalled();
    });

    it('creates a new file without calling utimes (no prior mtime to preserve)', async () => {
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      readFileSpy.mockRejectedValue(enoent);

      const project = makeProject('packages/foo');
      await createTypeCheckConfigs(makeLog(), [project], [project], {
        preserveTimestampOnWrite: true,
      });

      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      expect(utimesSpy).not.toHaveBeenCalled();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { writeFileSync, unlinkSync } from 'fs';
import { Server } from 'hapi';
import { resolve } from 'path';
import { tmpdir } from 'os';
import {
  createTelemetryUsageCollector,
  isFileReadable,
  readTelemetryFile,
  KibanaHapiServer,
  MAX_FILE_SIZE,
} from './telemetry_usage_collector';

const getMockServer = (): KibanaHapiServer =>
  ({
    usage: {
      collectorSet: { makeUsageCollector: jest.fn().mockImplementationOnce((arg: object) => arg) },
    },
  } as KibanaHapiServer & Server);

const serverWithConfig = (configPath: string): KibanaHapiServer & Server => {
  return {
    ...getMockServer(),
    config: () => ({
      get: (key: string) => {
        if (key !== 'xpack.telemetry.config' && key !== 'xpack.xpack_main.telemetry.config') {
          throw new Error('Expected `xpack.telemetry.config`');
        }

        return configPath;
      },
    }),
  } as KibanaHapiServer & Server;
};

describe('telemetry_usage_collector', () => {
  const tempDir = tmpdir();
  const tempFiles = {
    blank: resolve(tempDir, 'tests-telemetry_usage_collector-blank.yml'),
    empty: resolve(tempDir, 'tests-telemetry_usage_collector-empty.yml'),
    too_big: resolve(tempDir, 'tests-telemetry_usage_collector-too_big.yml'),
    unreadable: resolve(tempDir, 'tests-telemetry_usage_collector-unreadable.yml'),
    valid: resolve(tempDir, 'telemetry.yml'),
  };
  const invalidFiles = [tempFiles.too_big, tempFiles.unreadable];
  const validFiles = [tempFiles.blank, tempFiles.empty, tempFiles.valid];
  const allFiles = Object.values(tempFiles);
  const expectedObject = {
    expected: 'value',
    more: {
      nested: {
        one: 1,
        two: 2,
      },
    },
  };

  // create temp files
  beforeAll(() => {
    // blank
    writeFileSync(tempFiles.blank, '\n');
    // empty
    writeFileSync(tempFiles.empty, '');
    // 1 byte too big
    writeFileSync(tempFiles.too_big, new Buffer(MAX_FILE_SIZE + 1));
    // write-only file
    writeFileSync(tempFiles.unreadable, 'valid: true', { mode: 0o222 });
    // valid
    writeFileSync(tempFiles.valid, 'expected: value\nmore.nested.one: 1\nmore.nested.two: 2');
  });

  // delete temp files
  afterAll(() => {
    allFiles.forEach(path => {
      try {
        unlinkSync(path);
      } catch (err) {
        // ignored
      }
    });
  });

  describe('isFileReadable', () => {
    test('returns `undefined` no file is readable', async () => {
      expect(isFileReadable('')).toBe(false);
      invalidFiles.forEach(path => {
        expect(isFileReadable(path)).toBe(false);
      });
    });

    test('returns `true` file that has valid data', async () => {
      expect(allFiles.filter(isFileReadable)).toEqual(validFiles);
    });
  });

  describe('readTelemetryFile', () => {
    test('returns `undefined` if no path was found', async () => {
      expect(await readTelemetryFile('')).toBeUndefined();
      for (const invalidFile of invalidFiles) {
        expect(await readTelemetryFile(invalidFile)).toBeUndefined();
      }
    });

    test('returns `undefined` if the file is blank or empty', async () => {
      expect(await readTelemetryFile(tempFiles.blank)).toBeUndefined();
      expect(await readTelemetryFile(tempFiles.empty)).toBeUndefined();
    });

    test('returns the object parsed from the YAML file', async () => {
      expect(await readTelemetryFile(tempFiles.valid)).toEqual(expectedObject);
    });
  });

  describe('createTelemetryUsageCollector', () => {
    test('calls `collectorSet.makeUsageCollector`', async () => {
      // note: it uses the file's path to get the directory, then looks for 'telemetry.yml'
      // exclusively, which is indirectly tested by passing it the wrong "file" in the same
      // dir
      const server: KibanaHapiServer & Server = serverWithConfig(tempFiles.unreadable);

      // the `makeUsageCollector` is mocked above to return the argument passed to it
      const collectorOptions = createTelemetryUsageCollector(server);

      expect(collectorOptions.type).toBe('static_telemetry');
      expect(await collectorOptions.fetch()).toEqual(expectedObject);
    });
  });
});

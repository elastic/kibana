/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { writeFileSync, unlinkSync } from 'fs';
import { Server } from 'hapi';
import { shuffle } from 'lodash';
import { resolve } from 'path';
import { tmpdir } from 'os';
import {
  findFirstReadableFile,
  createTelemetryUsageCollector,
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

describe('telemetry_usage_collector', () => {
  const tempDir = tmpdir();
  const tempFiles = {
    blank: resolve(tempDir, 'tests-telemetry_usage_collector-blank.yml'),
    empty: resolve(tempDir, 'tests-telemetry_usage_collector-empty.yml'),
    too_big: resolve(tempDir, 'tests-telemetry_usage_collector-too_big.yml'),
    unreadable: resolve(tempDir, 'tests-telemetry_usage_collector-unreadable.yml'),
    valid: resolve(tempDir, 'tests-telemetry_usage_collector-valid.yml'),
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

  describe('findFirstReadableFile', () => {
    test('returns `undefined` no file is readable', async () => {
      expect(findFirstReadableFile([])).toBeUndefined();
      expect(findFirstReadableFile(invalidFiles)).toBeUndefined();
    });

    test('returns the first file that has valid data', async () => {
      expect(findFirstReadableFile(allFiles)).toBe(tempFiles.empty);
      // allFiles is shuffled so we randomly go through the list
      expect(validFiles).toContain(findFirstReadableFile(shuffle(allFiles)));
    });
  });

  describe('readTelemetryFile', () => {
    test('returns `undefined` if no path was found', async () => {
      expect(await readTelemetryFile(null, [])).toBeUndefined();
      expect(await readTelemetryFile(null, invalidFiles)).toBeUndefined();
    });

    test('returns `undefined` if the file is blank or empty', async () => {
      expect(await readTelemetryFile(null, [tempFiles.blank])).toBeUndefined();
      expect(await readTelemetryFile(null, [tempFiles.empty])).toBeUndefined();
    });

    test('returns the object parsed from the YAML file', async () => {
      expect(await readTelemetryFile(null, [tempFiles.valid])).toEqual(expectedObject);
    });
  });

  describe('createTelemetryUsageCollector', () => {
    test('returns calls `collectorSet.makeUsageCollector`', async () => {
      // the `makeUsageCollector` is mocked above to return the argument passed to it
      const collectorOptions = createTelemetryUsageCollector(getMockServer());

      expect(collectorOptions.type).toBe('static_telemetry');
      expect(collectorOptions.fetch).toBe(readTelemetryFile);
    });
  });
});

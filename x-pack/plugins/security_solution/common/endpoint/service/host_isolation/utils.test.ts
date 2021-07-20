/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVersionSupported, isOsSupported, isIsolationSupported } from './utils';

describe('Host Isolation utils isVersionSupported', () => {
  test.each`
    a                         | b           | expected
    ${'8.14.0'}               | ${'7.13.0'} | ${true}
    ${'7.14.0'}               | ${'7.13.0'} | ${true}
    ${'7.14.1'}               | ${'7.14.0'} | ${true}
    ${'8.14.0'}               | ${'9.14.0'} | ${false}
    ${'7.13.0'}               | ${'7.14.0'} | ${false}
    ${'7.14.0'}               | ${'7.14.1'} | ${false}
    ${'7.14.0'}               | ${'7.14.0'} | ${true}
    ${'7.14.0-SNAPSHOT'}      | ${'7.14.0'} | ${true}
    ${'7.14.0-SNAPSHOT-beta'} | ${'7.14.0'} | ${true}
    ${'7.14.0-alpha'}         | ${'7.14.0'} | ${true}
    ${'8.0.0-SNAPSHOT'}       | ${'7.14.0'} | ${true}
    ${'8.0.0'}                | ${'7.14.0'} | ${true}
  `('should validate that version $a is compatible($expected) to $b', ({ a, b, expected }) => {
    expect(
      isVersionSupported({
        currentVersion: a,
        minVersionRequired: b,
      })
    ).toEqual(expected);
  });
});

describe('Host Isolation utils isOsSupported', () => {
  test.each`
    a          | b                       | expected
    ${'linux'} | ${['macos', 'linux']}   | ${true}
    ${'linux'} | ${['macos', 'windows']} | ${false}
  `('should validate that os $a is compatible($expected) to $b', ({ a, b, expected }) => {
    expect(
      isOsSupported({
        currentOs: a,
        supportedOss: b,
      })
    ).toEqual(expected);
  });
});

describe('Host Isolation utils isIsolationSupported', () => {
  test.each`
    a            | b           | expected
    ${'windows'} | ${'7.14.0'} | ${true}
    ${'linux'}   | ${'7.13.0'} | ${false}
    ${'linux'}   | ${'7.14.0'} | ${false}
    ${'macos'}   | ${'7.13.0'} | ${false}
  `(
    'should validate that os $a and version $b supports hostIsolation($expected)',
    ({ a, b, expected }) => {
      expect(
        isIsolationSupported({
          osName: a,
          version: b,
        })
      ).toEqual(expected);
    }
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVersionSupported, isOsSupported, isIsolationSupported } from './utils';

describe('Host Isolation utils isVersionSupported', () => {
  // NOTE: the `7.15.0.8295.0` and the text current versions are invalid.
  test.each`
    currentVersion            | minVersionRequired | expected
    ${'8.14.0'}               | ${'7.13.0'}        | ${true}
    ${'7.14.0'}               | ${'7.13.0'}        | ${true}
    ${'7.14.1'}               | ${'7.14.0'}        | ${true}
    ${'8.14.0'}               | ${'9.14.0'}        | ${false}
    ${'7.13.0'}               | ${'7.14.0'}        | ${false}
    ${'7.14.0'}               | ${'7.14.1'}        | ${false}
    ${'7.14.0'}               | ${'7.14.0'}        | ${true}
    ${'7.14.0-SNAPSHOT'}      | ${'7.14.0'}        | ${true}
    ${'7.14.0-SNAPSHOT-beta'} | ${'7.14.0'}        | ${true}
    ${'7.14.0-alpha'}         | ${'7.14.0'}        | ${true}
    ${'8.0.0-SNAPSHOT'}       | ${'7.14.0'}        | ${true}
    ${'8.0.0'}                | ${'7.14.0'}        | ${true}
    ${'7.15.0.8295.0'}        | ${'7.14.0'}        | ${false}
    ${'NOT_SEMVER'}           | ${'7.14.0'}        | ${false}
  `(
    'should validate that version $a is compatible($expected) to $b',
    ({ currentVersion, minVersionRequired, expected }) => {
      expect(
        isVersionSupported({
          currentVersion,
          minVersionRequired,
        })
      ).toEqual(expected);
    }
  );
});

describe('Host Isolation utils isOsSupported', () => {
  test.each`
    currentOs  | supportedOss                      | expected
    ${'linux'} | ${{ macos: true, linux: true }}   | ${true}
    ${'linux'} | ${{ macos: true, windows: true }} | ${false}
  `(
    'should validate that os $a is compatible($expected) to $b',
    ({ currentOs, supportedOss, expected }) => {
      expect(
        isOsSupported({
          currentOs,
          supportedOss,
        })
      ).toEqual(expected);
    }
  );
});

describe('Host Isolation utils isIsolationSupported', () => {
  test.each`
    osName       | version     | capabilities     | expected
    ${'windows'} | ${'7.14.0'} | ${[]}            | ${true}
    ${'linux'}   | ${'7.13.0'} | ${['isolation']} | ${false}
    ${'linux'}   | ${'7.14.0'} | ${['isolation']} | ${false}
    ${'macos'}   | ${'7.13.0'} | ${['isolation']} | ${false}
    ${'linux'}   | ${'7.13.0'} | ${['isolation']} | ${false}
    ${'windows'} | ${'7.15.0'} | ${[]}            | ${false}
    ${'macos'}   | ${'7.15.0'} | ${[]}            | ${false}
    ${'linux'}   | ${'7.15.0'} | ${['isolation']} | ${true}
    ${'macos'}   | ${'7.15.0'} | ${['isolation']} | ${true}
    ${'linux'}   | ${'7.16.0'} | ${['isolation']} | ${true}
  `(
    'should validate that os $a, version $b, and capabilities $c supports hostIsolation($expected)',
    ({ osName, version, capabilities, expected }) => {
      expect(
        isIsolationSupported({
          osName,
          version,
          capabilities,
        })
      ).toEqual(expected);
    }
  );
});

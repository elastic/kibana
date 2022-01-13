/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('getos', () => jest.fn());

import { getDefaultChromiumSandboxDisabled } from './default_chromium_sandbox_disabled';
import getos from 'getos';

describe('getDefaultChromiumSandboxDisabled', () => {
  it.each`
    os          | dist               | release     | expected
    ${'win32'}  | ${'Windows'}       | ${'11'}     | ${false}
    ${'darwin'} | ${'macOS'}         | ${'11.2.3'} | ${false}
    ${'linux'}  | ${'Centos'}        | ${'7.0'}    | ${true}
    ${'linux'}  | ${'Red Hat Linux'} | ${'7.0'}    | ${true}
    ${'linux'}  | ${'Ubuntu Linux'}  | ${'14.04'}  | ${false}
    ${'linux'}  | ${'Ubuntu Linux'}  | ${'16.04'}  | ${false}
    ${'linux'}  | ${'SUSE Linux'}    | ${'11'}     | ${false}
    ${'linux'}  | ${'SUSE Linux'}    | ${'12'}     | ${false}
    ${'linux'}  | ${'SUSE Linux'}    | ${'42.0'}   | ${false}
    ${'linux'}  | ${'Debian'}        | ${'8'}      | ${true}
    ${'linux'}  | ${'Debian'}        | ${'9'}      | ${true}
  `('should return $expected for $dist $release', async ({ expected, ...os }) => {
    (getos as jest.Mock).mockImplementation((cb) => cb(null, os));

    await expect(getDefaultChromiumSandboxDisabled()).resolves.toHaveProperty(
      'disableSandbox',
      expected
    );
  });
});

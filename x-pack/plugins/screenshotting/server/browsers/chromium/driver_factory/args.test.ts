/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import { args } from './args';
import { getChromiumPackage } from '../../../utils';

// Since chromium v111 headless mode in arm based macs is not working with `--disable-gpu`
// This is a known issue: headless uses swiftshader by default and swiftshader's support for WebGL is currently disabled on Arm pending the resolution of https://issuetracker.google.com/issues/165000222.
// As a workaround, we force hardware GL drivers on mac.
// The best way to do this starting with v112 is by passing --enable-gpu,
// v111 and older versions should work with --use-angle.
describe('headless webgl arm mac workaround', () => {
  const originalPlatform = process.platform;
  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  const simulateEnv = (platform: string, arch: string) => {
    Object.defineProperty(process, 'platform', { value: platform });
    jest.spyOn(os, 'arch').mockReturnValue(arch);
  };

  test('disables gpu for non arm mac', () => {
    simulateEnv('darwin', 'x64');

    const flags = args({
      userDataDir: '/',
      proxy: { enabled: false },
    });
    expect(flags.includes(`--disable-gpu`)).toBe(true);
  });

  test("doesn't disable gpu when on an arm mac, adds --use-angle", () => {
    simulateEnv('darwin', 'arm64');

    const flags = args({
      userDataDir: '/',
      proxy: { enabled: false },
    });
    expect(flags.includes(`--disable-gpu`)).toBe(false);
    expect(flags.includes(`--use-angle`)).toBe(true);

    // if you're updating this, then you're likely updating chromium
    // please double-check that the --use-angle flag is still needed for arm macs
    // instead of --use-angle you may need --enable-gpu
    expect(getChromiumPackage().binaryChecksum).toBe(
      '9ff994371f828a9e7ac8c69f95fd1d38b1115c438f4f94a4d75a41843ec53673'
    ); // just putting this here so that someone updating the chromium version will see this comment
  });
});

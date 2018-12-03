/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('os', () => ({
  platform: jest.fn(),
  release: jest.fn(),
}));
jest.mock('getos');

import os from 'os';
import getos from 'getos';

import { getOSInfo } from './get_os_info';

describe('getOSInfo', () => {
  it('returns basic OS info on non-linux', async () => {
    os.platform.mockImplementation(() => 'darwin');
    os.release.mockImplementation(() => '1.0.0');

    const osInfo = await getOSInfo();

    expect(osInfo).toEqual({
      platform: 'darwin',
      platformRelease: 'darwin-1.0.0',
    });
  });

  it('returns basic OS info and distro info on linux', async () => {
    os.platform.mockImplementation(() => 'linux');
    os.release.mockImplementation(() => '4.9.93-linuxkit-aufs');

    // Mock getos response
    getos.mockImplementation((cb) => cb(null, {
      os: 'linux',
      dist: 'Ubuntu Linux',
      codename: 'precise',
      release: '12.04'
    }));

    const osInfo = await getOSInfo();

    expect(osInfo).toEqual({
      platform: 'linux',
      platformRelease: 'linux-4.9.93-linuxkit-aufs',
      // linux distro info
      distro: 'Ubuntu Linux',
      distroRelease: 'Ubuntu Linux-12.04',
    });
  });
});

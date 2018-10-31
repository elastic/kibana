/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import getos from 'getos';
import { promisify } from 'util';

/**
 * Returns an object of OS information/
 */
export async function getOSInfo() {
  const osInfo = {
    platform: os.platform(),
    // Include the platform name in the release to avoid grouping unrelated platforms together.
    // release 1.0 across windows, linux, and darwin don't mean anything useful.
    platformRelease: `${os.platform()}-${os.release()}`
  };

  // Get distribution information for linux
  if (os.platform() === 'linux') {
    try {
      const distro = await promisify(getos)();
      osInfo.distro = distro.dist;
      // Include distro name in release for same reason as above.
      osInfo.distroRelease = `${distro.dist}-${distro.release}`;
    } catch (e) {
      // ignore errors
    }
  }

  return osInfo;
}

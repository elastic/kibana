/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getosSync from 'getos';
import { promisify } from 'util';
import { PHANTOM, CHROMIUM } from './browser_types';

const getos = promisify(getosSync);

// Chromium is unsupported on RHEL/CentOS before 7.0.
const distroSupportsChromium = (distro, release) => {
  if (distro.toLowerCase() !== 'centos' && distro.toLowerCase() !== 'red hat linux') {
    return true;
  }
  const releaseNumber = parseInt(release, 10);
  return releaseNumber >= 7;
};

export async function getDefaultBrowser() {
  const os = await getos();

  if (os.os === 'linux' && !distroSupportsChromium(os.dist, os.release)) {
    return PHANTOM;
  } else {
    return CHROMIUM;
  }
}

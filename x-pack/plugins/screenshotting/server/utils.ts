/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import { ChromiumArchivePaths, download as baseDownload, install as baseInstall } from './browsers';

const paths = new ChromiumArchivePaths();

export const getChromiumPackage = () => {
  const platform = process.platform;
  const architecture = os.arch();

  const chromiumPackageInfo = paths.find(process.platform, architecture);
  if (!chromiumPackageInfo) {
    throw new Error(`Unsupported platform: ${platform}-${architecture}`);
  }
  return chromiumPackageInfo;
};

export const download = baseDownload.bind(undefined, paths);
export const install = baseInstall.bind(undefined, paths);

export { paths };

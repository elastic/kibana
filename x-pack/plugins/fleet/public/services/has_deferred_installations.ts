/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, PackageListItem, EsAssetReference } from '../../common';

export const getDeferredInstallationsCnt = (pkg?: PackageInfo | PackageListItem | null): number => {
  if (!pkg) return 0;
  const installedEs: EsAssetReference[] =
    // @ts-ignore-next-line
    pkg?.savedObject?.attributes?.installed_es || pkg?.attributes?.installed_es;
  return installedEs ? installedEs.filter((d) => d.deferred).length : 0;
};

export const hasDeferredInstallations = (pkg?: PackageInfo | PackageListItem | null): boolean =>
  getDeferredInstallationsCnt(pkg) > 0;

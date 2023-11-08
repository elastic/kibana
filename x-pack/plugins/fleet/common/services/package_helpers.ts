/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

/**
 * Return true if a package need Elastic Agent to be run as root/administrator
 */
export function isRootPrivilegesRequired(packageInfo: PackageInfo) {
  return (
    packageInfo.agent?.privileges?.root ||
    packageInfo.data_streams?.some((d) => d.agent?.privileges?.root)
  );
}

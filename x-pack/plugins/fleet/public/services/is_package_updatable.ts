/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semverLt from 'semver/functions/lt';

import type { PackageInfo, PackageListItem } from '../types';

export const isPackageUpdatable = (pkg: PackageInfo | PackageListItem): boolean =>
  'savedObject' in pkg &&
  pkg.savedObject &&
  semverLt(pkg.savedObject.attributes.version, pkg.version);

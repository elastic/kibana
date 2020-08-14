/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../../../licensing/public';

export const hasPlatinumLicense = (license?: ILicense) => {
  return license?.isActive && ['platinum', 'enterprise', 'trial'].includes(license?.type as string);
};

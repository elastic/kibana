/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/public';
import { LicensingPlugin } from './plugin';

export { LICENSE_TYPE } from '../common/types';
export type {
  ILicense,
  LicenseCheck,
  LicenseCheckState,
  LicenseFeature,
  LicenseStatus,
  LicenseType,
  PublicFeatures,
  PublicLicense,
  PublicLicenseJSON,
} from '../common/types';
export type { LicensingPluginSetup, LicensingPluginStart } from './types';

export const plugin = (context: PluginInitializerContext) => new LicensingPlugin(context);

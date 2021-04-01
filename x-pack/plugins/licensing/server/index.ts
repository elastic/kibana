/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/server';
import { LicensingPlugin } from './plugin';

export const plugin = (context: PluginInitializerContext) => new LicensingPlugin(context);

export type { FeatureUsageServiceSetup, FeatureUsageServiceStart } from './services';
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
export type {
  ElasticsearchError,
  LicensingApiRequestHandlerContext,
  LicensingPluginSetup,
  LicensingPluginStart,
  LicensingRequestHandlerContext,
  LicensingRouter,
  RawFeature,
  RawFeatures,
  RawLicense,
} from './types';
export { config } from './licensing_config';
export { wrapRouteWithLicenseCheck } from './wrap_route_with_license_check';
export type { CheckLicense } from './wrap_route_with_license_check';

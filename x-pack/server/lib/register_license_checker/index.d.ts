/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { LicenseType } from '../../../common/constants';

export declare function registerLicenseChecker(
  server: Legacy.Server,
  pluginId: string,
  pluginName: string,
  minimumLicenseRequired: LicenseType
): void;

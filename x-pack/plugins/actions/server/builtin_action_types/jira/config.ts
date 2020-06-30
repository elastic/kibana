/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalServiceConfiguration } from '../case/types';
import * as i18n from './translations';

export const config: ExternalServiceConfiguration = {
  id: '.jira',
  name: i18n.NAME,
  minimumLicenseRequired: 'gold',
};

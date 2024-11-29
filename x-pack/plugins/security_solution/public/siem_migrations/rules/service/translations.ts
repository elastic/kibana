/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLLING_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rulesService.pollingError',
  { defaultMessage: 'Error fetching rule migrations' }
);

export const MISSING_CONNECTOR_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rulesService.missingConnectorError',
  { defaultMessage: 'Connector not defined. Please set a connector ID first.' }
);

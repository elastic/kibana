/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SYNTHETICS_ENABLE_FAILURE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsEnabledFailure',
  {
    defaultMessage: 'Monitor Management was not able to be enabled. Please contact support.',
  }
);

export const SYNTHETICS_DISABLE_FAILURE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsDisabledFailure',
  {
    defaultMessage: 'Monitor Management was not able to be disabled. Please contact support.',
  }
);

export const SYNTHETICS_ENABLE_SUCCESS = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsEnableSuccess',
  {
    defaultMessage: 'Monitor Management enabled successfully.',
  }
);

export const SYNTHETICS_DISABLE_SUCCESS = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsDisabledSuccess',
  {
    defaultMessage: 'Monitor Management disabled successfully.',
  }
);

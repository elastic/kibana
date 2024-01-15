/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FIRED_ACTIONS_ID = 'custom_threshold.fired';
export const NO_DATA_ACTIONS_ID = 'custom_threshold.nodata';

export const UNGROUPED_FACTORY_KEY = '*';

export const FIRED_ACTION = {
  id: FIRED_ACTIONS_ID,
  name: i18n.translate('xpack.observability.customThreshold.rule.alerting.custom_threshold.fired', {
    defaultMessage: 'Alert',
  }),
};

export const NO_DATA_ACTION = {
  id: NO_DATA_ACTIONS_ID,
  name: i18n.translate(
    'xpack.observability.customThreshold.rule.alerting.custom_threshold.nodata',
    {
      defaultMessage: 'No Data',
    }
  ),
};

export const CUSTOM_THRESHOLD_AAD_FIELDS = [
  'cloud.*',
  'host.*',
  'orchestrator.*',
  'container.*',
  'labels.*',
  'tags',
];

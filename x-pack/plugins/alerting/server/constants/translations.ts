/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const translations = {
  taskRunner: {
    warning: {
      maxExecutableActions: i18n.translate(
        'xpack.alerting.taskRunner.warning.maxExecutableActions',
        {
          defaultMessage:
            'The maximum number of actions for this rule type was reached; excess actions were not triggered.',
        }
      ),
      maxAlerts: i18n.translate('xpack.alerting.taskRunner.warning.maxAlerts', {
        defaultMessage:
          'Rule reported more than the maximum number of alerts in a single run. Alerts may be missed and recovery notifications may be delayed',
      }),
    },
  },
};

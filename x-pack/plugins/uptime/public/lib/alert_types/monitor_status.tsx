/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';

import {
  ALERT_END,
  ALERT_START,
  ALERT_STATUS,
  ALERT_REASON,
} from '@kbn/rule-data-utils/technical_field_names';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils/alerts_as_data_status';

import { AlertTypeInitializer } from '.';
import { getMonitorRouteFromMonitorId } from './common';
import { MonitorStatusTranslations } from '../../../common/translations';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { ObservabilityRuleTypeModel } from '../../../../observability/public';
import { ValidationResult } from '../../../../triggers_actions_ui/public';

const { defaultActionMessage, description } = MonitorStatusTranslations;

const MonitorStatusAlert = React.lazy(() => import('./lazy_wrapper/monitor_status'));

let validateFunc: (alertParams: any) => ValidationResult;

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): ObservabilityRuleTypeModel => ({
  id: CLIENT_ALERT_TYPES.MONITOR_STATUS,
  description,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.monitorStatus}`;
  },
  alertParamsExpression: (params: any) => (
    <MonitorStatusAlert core={core} plugins={plugins} params={params} />
  ),
  validate: (alertParams: any) => {
    if (!validateFunc) {
      (async function loadValidate() {
        const { validateMonitorStatusParams } = await import(
          './lazy_wrapper/validate_monitor_status'
        );
        validateFunc = validateMonitorStatusParams;
      })();
    }
    return validateFunc ? validateFunc(alertParams) : ({} as ValidationResult);
  },
  defaultActionMessage,
  requiresAppContext: false,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: getMonitorRouteFromMonitorId({
      monitorId: fields['monitor.id']!,
      dateRangeEnd: fields[ALERT_STATUS] === ALERT_STATUS_ACTIVE ? 'now' : fields[ALERT_END]!,
      dateRangeStart: moment(new Date(fields[ALERT_START]!)).subtract('5', 'm').toISOString(),
      filters: {
        'observer.geo.name': [fields['observer.geo.name'][0]],
      },
    }),
  }),
});

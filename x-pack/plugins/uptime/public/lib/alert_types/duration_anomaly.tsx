/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';

import { ALERT_END, ALERT_STATUS, ALERT_STATUS_ACTIVE, ALERT_REASON } from '@kbn/rule-data-utils';

import { AlertTypeInitializer } from '.';
import { getMonitorRouteFromMonitorId } from '../../../common/utils/get_monitor_url';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { DurationAnomalyTranslations } from '../../../common/translations';
import { ObservabilityRuleTypeModel } from '../../../../observability/public';

const { defaultActionMessage, description } = DurationAnomalyTranslations;
const DurationAnomalyAlert = React.lazy(() => import('./lazy_wrapper/duration_anomaly'));

export const initDurationAnomalyAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): ObservabilityRuleTypeModel => ({
  id: CLIENT_ALERT_TYPES.DURATION_ANOMALY,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.uptimeDurationAnomaly}`;
  },
  ruleParamsExpression: (params: unknown) => (
    <DurationAnomalyAlert core={core} plugins={plugins} params={params} />
  ),
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: true,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: getMonitorRouteFromMonitorId({
      monitorId: fields['monitor.id']!,
      dateRangeEnd: fields[ALERT_STATUS] === ALERT_STATUS_ACTIVE ? 'now' : fields[ALERT_END]!,
      dateRangeStart: moment(new Date(fields['anomaly.start']!)).subtract('5', 'm').toISOString(),
    }),
  }),
});

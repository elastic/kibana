/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';

import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { DurationAnomalyTranslations } from '../../../common/translations';
import { AlertTypeInitializer } from '.';

import { getMonitorRouteFromMonitorId } from './common';

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
    return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/duration-anomaly-alert.html`;
  },
  alertParamsExpression: (params: unknown) => (
    <DurationAnomalyAlert core={core} plugins={plugins} params={params} />
  ),
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: true,
  format: ({ fields }) => ({
    reason: fields.reason,
    link: getMonitorRouteFromMonitorId({
      monitorId: fields['monitor.id']!,
      dateRangeEnd:
        fields['kibana.rac.alert.status'] === 'open' ? 'now' : fields['kibana.rac.alert.end']!,
      dateRangeStart: moment(new Date(fields['anomaly.start']!)).subtract('5', 'm').toISOString(),
    }),
  }),
});

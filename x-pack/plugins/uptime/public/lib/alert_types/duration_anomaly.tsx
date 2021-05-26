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

import { format } from './common';

import { FormattableAlertTypeModel } from '../../../../observability/public';

const { defaultActionMessage, description } = DurationAnomalyTranslations;
const DurationAnomalyAlert = React.lazy(() => import('./lazy_wrapper/duration_anomaly'));

export const initDurationAnomalyAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): FormattableAlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.DURATION_ANOMALY,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/uptime/${docLinks.DOC_LINK_VERSION}/uptime-alerting.html`;
  },
  alertParamsExpression: (params: unknown) => (
    <DurationAnomalyAlert core={core} plugins={plugins} params={params} />
  ),
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: true,
  format: ({ fields }) => {
    return {
      reason: fields.reason,
      link: format({
        pathname: `/app/uptime/monitor/${btoa(fields['monitor.id']!)}`,
        query: {
          dateRangeEnd:
            fields['kibana.rac.alert.status'] === 'open' ? 'now' : fields['kibana.rac.alert.end'],
          dateRangeStart: moment(new Date(fields['anomaly.start']))
            .subtract('5', 'm')
            .toISOString(),
        },
      }),
    };
  },
});

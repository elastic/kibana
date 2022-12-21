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
  ALERT_STATUS_ACTIVE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';

import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { StatusRuleParams } from '../../../../../common/rules/status_rule';
import { getMonitorRouteFromMonitorId } from '../../../../../common/utils/get_monitor_url';
import { SYNTHETICS_ALERT_RULE_TYPES } from '../../../../../common/constants/synthetics_alerts';
import { MonitorStatusTranslations } from '../../../../../common/translations';
import { AlertTypeInitializer } from '.';
const { defaultActionMessage, defaultRecoveryMessage, description } = MonitorStatusTranslations;

const MonitorStatusAlert = React.lazy(() => import('./lazy_wrapper/monitor_status'));

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): ObservabilityRuleTypeModel => ({
  id: SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS,
  description,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.monitorStatus}`;
  },
  ruleParamsExpression: (paramProps: RuleTypeParamsExpressionProps<StatusRuleParams>) => (
    <MonitorStatusAlert core={core} plugins={plugins} params={paramProps} />
  ),
  validate: (ruleParams: StatusRuleParams) => {
    return { errors: {} };
  },
  defaultActionMessage,
  defaultRecoveryMessage,
  requiresAppContext: false,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: getMonitorRouteFromMonitorId({
      monitorId: fields['monitor.id']!,
      dateRangeEnd: fields[ALERT_STATUS] === ALERT_STATUS_ACTIVE ? 'now' : fields[ALERT_END]!,
      dateRangeStart: moment(new Date(fields[ALERT_START]!)).subtract('5', 'm').toISOString(),
      filters: {
        'observer.geo.name': [fields?.['observer.geo.name']?.[0]],
      },
    }),
  }),
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { AlertTypeInitializer } from '.';
import { AtomicStatusCheckParamsType } from '../../../common/runtime_types';
import { MonitorStatusTitle } from './monitor_status_title';
import { CLIENT_ALERT_TYPES } from '../../../common/constants';
import { MonitorStatusTranslations } from './translations';

export const validate = (alertParams: unknown) => {
  const errors: Record<string, any> = {};
  const decoded = AtomicStatusCheckParamsType.decode(alertParams);

  if (!isRight(decoded)) {
    errors.typeCheckFailure = 'Provided parameters do not conform to the expected type.';
    errors.typeCheckParsingMessage = PathReporter.report(decoded);
  } else {
    const { numTimes, timerangeCount } = decoded.right;
    if (numTimes < 1) {
      errors.invalidNumTimes = 'Number of alert check down times must be an integer greater than 0';
    }
    if (isNaN(timerangeCount)) {
      errors.timeRangeStartValueNaN = 'Specified time range value must be a number';
    }
    if (timerangeCount <= 0) {
      errors.invalidTimeRangeValue = 'Time range value must be greater than 0';
    }
  }

  return { errors };
};

const { defaultActionMessage } = MonitorStatusTranslations;

const AlertMonitorStatus = React.lazy(() =>
  import('../../components/overview/alerts/alerts_containers/alert_monitor_status')
);

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  autocomplete,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.MONITOR_STATUS,
  name: <MonitorStatusTitle />,
  iconClass: 'uptimeApp',
  alertParamsExpression: (params: any) => (
    <AlertMonitorStatus {...params} autocomplete={autocomplete} />
  ),
  validate,
  defaultActionMessage,
  requiresAppContext: true,
});

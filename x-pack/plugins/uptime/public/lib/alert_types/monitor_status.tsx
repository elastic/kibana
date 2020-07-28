/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { AlertTypeInitializer } from '.';

import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { MonitorStatusTranslations } from './translations';
import {
  AtomicStatusCheckParamsType,
  StatusCheckParamsType,
  MonitorAvailabilityType,
} from '../../../common/runtime_types';

const { defaultActionMessage } = MonitorStatusTranslations;

const MonitorStatusAlert = React.lazy(() => import('./lazy_wrapper/monitor_status'));

export const validate = (alertParams: any) => {
  const errors: Record<string, any> = {};
  const decoded = AtomicStatusCheckParamsType.decode(alertParams);
  const oldDecoded = StatusCheckParamsType.decode(alertParams);
  const availabilityDecoded = MonitorAvailabilityType.decode(alertParams);

  if (!isRight(decoded) && !isRight(oldDecoded) && !isRight(availabilityDecoded)) {
    return {
      errors: {
        typeCheckFailure: 'Provided parameters do not conform to the expected type.',
        typeCheckParsingMessage: PathReporter.report(decoded),
      },
    };
  }

  if (
    !(alertParams.shouldCheckAvailability ?? false) &&
    !(alertParams.shouldCheckStatus ?? false)
  ) {
    return {
      errors: {
        noAlertSelected: 'Alert must check for monitor status or monitor availability.',
      },
    };
  }

  if (isRight(decoded) && decoded.right.shouldCheckStatus) {
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

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.MONITOR_STATUS,
  name: (
    <FormattedMessage
      id="xpack.uptime.alerts.monitorStatus.title.label"
      defaultMessage="Uptime monitor status"
    />
  ),
  iconClass: 'uptimeApp',
  alertParamsExpression: (params: any) => (
    <MonitorStatusAlert core={core} plugins={plugins} params={params} />
  ),
  validate,
  defaultActionMessage,
  requiresAppContext: false,
});

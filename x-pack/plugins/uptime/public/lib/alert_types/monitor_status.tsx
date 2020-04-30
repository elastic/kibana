/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import React from 'react';
import DateMath from '@elastic/datemath';
import { isRight } from 'fp-ts/lib/Either';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { AlertTypeInitializer } from '.';
import { StatusCheckExecutorParamsType } from '../../../common/runtime_types';
import { AlertMonitorStatus } from '../../components/overview/alerts/alerts_containers';

export const validate = (alertParams: any) => {
  const errors: Record<string, any> = {};
  const decoded = StatusCheckExecutorParamsType.decode(alertParams);

  /*
   * When the UI initially loads, this validate function is called with an
   * empty set of params, we don't want to type check against that.
   */
  if (!isRight(decoded)) {
    errors.typeCheckFailure = 'Provided parameters do not conform to the expected type.';
    errors.typeCheckParsingMessage = PathReporter.report(decoded);
  }

  if (isRight(decoded)) {
    const { numTimes, timerange } = decoded.right;
    const { from, to } = timerange;
    const fromAbs = DateMath.parse(from)?.valueOf();
    const toAbs = DateMath.parse(to)?.valueOf();
    if (!fromAbs || isNaN(fromAbs)) {
      errors.timeRangeStartValueNaN = 'Specified time range `from` is an invalid value';
    }
    if (!toAbs || isNaN(toAbs)) {
      errors.timeRangeEndValueNaN = 'Specified time range `to` is an invalid value';
    }

    // the default values for this test will pass, we only want to specify an error
    // in the case that `from` is more recent than `to`
    if ((fromAbs ?? 0) > (toAbs ?? 1)) {
      errors.invalidTimeRange = 'Time range start cannot exceed time range end';
    }

    if (numTimes < 1) {
      errors.invalidNumTimes = 'Number of alert check down times must be an integer greater than 0';
    }
  }

  return { errors };
};

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  autocomplete,
}): AlertTypeModel => ({
  id: 'xpack.uptime.alerts.monitorStatus',
  name: 'Uptime monitor status',
  iconClass: 'uptimeApp',
  alertParamsExpression: params => {
    return <AlertMonitorStatus {...params} autocomplete={autocomplete} />;
  },
  validate,
  defaultActionMessage: `{{context.message}}\nLast triggered at: {{state.lastTriggeredAt}}\n{{context.downMonitorsWithGeo}}`,
});

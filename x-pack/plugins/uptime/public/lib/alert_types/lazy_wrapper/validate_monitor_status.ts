/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import {
  AtomicStatusCheckParamsType,
  MonitorAvailabilityType,
  StatusCheckParamsType,
} from '../../../../common/runtime_types/alerts';

export function validateMonitorStatusParams(ruleParams: any): ValidationResult {
  const errors: Record<string, any> = {};
  const decoded = AtomicStatusCheckParamsType.decode(ruleParams);
  const oldDecoded = StatusCheckParamsType.decode(ruleParams);
  const availabilityDecoded = MonitorAvailabilityType.decode(ruleParams);

  if (!isRight(decoded) && !isRight(oldDecoded) && !isRight(availabilityDecoded)) {
    return {
      errors: {
        typeCheckFailure: 'Provided parameters do not conform to the expected type.',
        typeCheckParsingMessage: PathReporter.report(decoded),
      },
    };
  }

  if (!(ruleParams.shouldCheckAvailability ?? false) && !(ruleParams.shouldCheckStatus ?? false)) {
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
}

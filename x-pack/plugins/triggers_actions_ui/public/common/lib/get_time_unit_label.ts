/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TIME_UNITS } from '../../application/constants';

export function getTimeUnitLabel(timeUnit = TIME_UNITS.SECOND, timeValue = '0') {
  switch (timeUnit) {
    case TIME_UNITS.SECOND:
      return i18n.translate('xpack.triggersActionsUI.timeUnits.secondLabel', {
        defaultMessage: '{timeValue, plural, one {second} other {seconds}}',
        values: { timeValue },
      });
    case TIME_UNITS.MINUTE:
      return i18n.translate('xpack.triggersActionsUI.timeUnits.minuteLabel', {
        defaultMessage: '{timeValue, plural, one {minute} other {minutes}}',
        values: { timeValue },
      });
    case TIME_UNITS.HOUR:
      return i18n.translate('xpack.triggersActionsUI.timeUnits.hourLabel', {
        defaultMessage: '{timeValue, plural, one {hour} other {hours}}',
        values: { timeValue },
      });
    case TIME_UNITS.DAY:
      return i18n.translate('xpack.triggersActionsUI.timeUnits.dayLabel', {
        defaultMessage: '{timeValue, plural, one {day} other {days}}',
        values: { timeValue },
      });
  }
}

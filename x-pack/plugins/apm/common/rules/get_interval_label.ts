/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public/application/constants/time_units';

export function getIntervalLabel(value: number, windowUnit: string): string {
  switch (windowUnit) {
    case TIME_UNITS.SECOND: {
      return i18n.translate('xpack.apm.alerts.windowUnit.second', {
        defaultMessage: '{value} {value, plural, one {second} other {seconds}}',
        values: { value },
      });
    }
    case TIME_UNITS.MINUTE: {
      return i18n.translate('xpack.apm.alerts.windowUnit.minute', {
        defaultMessage: '{value} {value, plural, one {minute} other {minutes}}',
        values: { value },
      });
    }
    case TIME_UNITS.HOUR: {
      return i18n.translate('xpack.apm.alerts.windowUnit.hour', {
        defaultMessage: '{value} {value, plural, one {hour} other {hours}}',
        values: { value },
      });
    }
    case TIME_UNITS.DAY: {
      return i18n.translate('xpack.apm.alerts.windowUnit.day', {
        defaultMessage: '{value} {value, plural, one {day} other {days}}',
        values: { value },
      });
    }
    default: {
      return `${value} ${windowUnit}`;
    }
  }
}

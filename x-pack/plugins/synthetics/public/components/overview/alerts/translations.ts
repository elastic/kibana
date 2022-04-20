/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SECONDS_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.secondsOption.ariaLabel',
  {
    defaultMessage: '"Seconds" time range select item',
  }
);

export const SECONDS = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.seconds', {
  defaultMessage: 'seconds',
});

export const MINUTES_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.minutesOption.ariaLabel',
  {
    defaultMessage: '"Minutes" time range select item',
  }
);

export const MINUTES = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.minutes', {
  defaultMessage: 'minutes',
});

export const HOURS_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.hoursOption.ariaLabel',
  {
    defaultMessage: '"Hours" time range select item',
  }
);

export const HOURS = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.hours', {
  defaultMessage: 'hours',
});

export const DAYS_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.daysOption.ariaLabel',
  {
    defaultMessage: '"Days" time range select item',
  }
);

export const DAYS = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.days', {
  defaultMessage: 'days',
});

export const WEEKS_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.weeksOption.ariaLabel',
  {
    defaultMessage: '"Weeks" time range select item',
  }
);

export const WEEKS = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.weeks', {
  defaultMessage: 'weeks',
});

export const MONTHS_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.monthsOption.ariaLabel',
  {
    defaultMessage: '"Months" time range select item',
  }
);

export const MONTHS = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.months', {
  defaultMessage: 'months',
});

export const YEARS_TIME_RANGE = i18n.translate(
  'xpack.uptime.alerts.timerangeUnitSelectable.yearsOption.ariaLabel',
  {
    defaultMessage: '"Years" time range select item',
  }
);

export const YEARS = i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.years', {
  defaultMessage: 'years',
});

export const ALERT_KUERY_BAR_ARIA = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.filterBar.ariaLabel',
  {
    defaultMessage: 'Input that allows filtering criteria for the monitor status alert',
  }
);

export const OPEN_THE_POPOVER_DOWN_COUNT = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.numTimesExpression.ariaLabel',
  {
    defaultMessage: 'Open the popover for down count input',
  }
);

export const ENTER_NUMBER_OF_DOWN_COUNTS = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.numTimesField.ariaLabel',
  {
    defaultMessage: 'Enter number of down counts required to trigger the alert',
  }
);

export const MATCHING_MONITORS_DOWN = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.numTimesExpression.matchingMonitors.description',
  {
    defaultMessage: 'matching monitors are down >',
  }
);

export const ANY_MONITOR_DOWN = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.numTimesExpression.anyMonitors.description',
  {
    defaultMessage: 'any monitor is down >',
  }
);

export const OPEN_THE_POPOVER_TIME_RANGE_VALUE = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.timerangeValueExpression.ariaLabel',
  {
    defaultMessage: 'Open the popover for time range value field',
  }
);

export const ENTER_NUMBER_OF_TIME_UNITS = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.timerangeValueField.ariaLabel',
  {
    defaultMessage: `Enter the number of time units for the alert's range`,
  }
);

export const ENTER_NUMBER_OF_TIME_UNITS_DESCRIPTION = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.timerangeValueField.expression',
  {
    defaultMessage: 'within',
  }
);

export const ENTER_NUMBER_OF_TIME_UNITS_VALUE = (value: number) =>
  i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeValueField.value', {
    defaultMessage: 'last {value}',
    values: { value },
  });

export const ENTER_AVAILABILITY_RANGE_ENABLED = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.isEnabledCheckbox.label',
  {
    defaultMessage: 'Availability',
  }
);

export const ENTER_AVAILABILITY_RANGE_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.timerangeValueField.popover.ariaLabel',
  {
    defaultMessage: 'Specify availability tracking time range',
  }
);

export const ENTER_AVAILABILITY_RANGE_UNITS_ARIA_LABEL = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.timerangeValueField.ariaLabel',
  {
    defaultMessage: `Enter the number of units for the alert's availability check.`,
  }
);

export const ENTER_AVAILABILITY_RANGE_UNITS_DESCRIPTION = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.timerangeValueField.expression',
  {
    defaultMessage: 'within the last',
  }
);

export const ENTER_AVAILABILITY_THRESHOLD_ARIA_LABEL = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.threshold.ariaLabel',
  {
    defaultMessage: 'Specify availability thresholds for this alert',
  }
);

export const ENTER_AVAILABILITY_THRESHOLD_INPUT_ARIA_LABEL = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.threshold.input.ariaLabel',
  {
    defaultMessage: 'Input an availability threshold to check for this alert',
  }
);

export const ENTER_AVAILABILITY_THRESHOLD_DESCRIPTION = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.threshold.description',
  {
    defaultMessage: 'matching monitors are up in',
    description:
      'This fragment explains that an alert will fire for monitors matching user-specified criteria',
  }
);

export const ENTER_ANY_AVAILABILITY_THRESHOLD_DESCRIPTION = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.threshold.anyMonitorDescription',
  {
    defaultMessage: 'any monitor is up in',
    description:
      'This fragment explains that an alert will fire for monitors matching user-specified criteria',
  }
);

export const ENTER_AVAILABILITY_THRESHOLD_VALUE = (value: string) =>
  i18n.translate('xpack.uptime.alerts.monitorStatus.availability.threshold.value', {
    defaultMessage: '< {value}% of checks',
    description:
      'This fragment specifies criteria that will cause an alert to fire for uptime monitors',
    values: { value },
  });

export const ENTER_AVAILABILITY_RANGE_SELECT_ARIA = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.unit.selectable',
  {
    defaultMessage: 'Use this select to set the availability range units for this alert',
  }
);

export const ENTER_AVAILABILITY_RANGE_SELECT_HEADLINE = i18n.translate(
  'xpack.uptime.alerts.monitorStatus.availability.unit.headline',
  {
    defaultMessage: 'Select time range unit',
  }
);

export const ADD_FILTER = i18n.translate('xpack.uptime.alerts.monitorStatus.addFilter', {
  defaultMessage: `Add filter`,
});

export const LOCATION = i18n.translate('xpack.uptime.alerts.monitorStatus.addFilter.location', {
  defaultMessage: `Location`,
});

export const TAG = i18n.translate('xpack.uptime.alerts.monitorStatus.addFilter.tag', {
  defaultMessage: `Tag`,
});

export const PORT = i18n.translate('xpack.uptime.alerts.monitorStatus.addFilter.port', {
  defaultMessage: `Port`,
});

export const TYPE = i18n.translate('xpack.uptime.alerts.monitorStatus.addFilter.type', {
  defaultMessage: `Type`,
});

export const TlsTranslations = {
  criteriaAriaLabel: i18n.translate('xpack.uptime.alerts.tls.criteriaExpression.ariaLabel', {
    defaultMessage:
      'An expression displaying the criteria for monitor that are watched by this alert',
  }),
  criteriaDescription: i18n.translate('xpack.uptime.alerts.tls.criteriaExpression.description', {
    defaultMessage: 'when',
    description:
      'The context of this `when` is in the conditional sense, like "when there are three cookies, eat them all".',
  }),
  criteriaValue: i18n.translate('xpack.uptime.alerts.tls.criteriaExpression.value', {
    defaultMessage: 'any monitor',
  }),
  expirationAriaLabel: i18n.translate('xpack.uptime.alerts.tls.expirationExpression.ariaLabel', {
    defaultMessage:
      'An expression displaying the threshold that will trigger the TLS alert for certificate expiration',
  }),
  expirationDescription: i18n.translate(
    'xpack.uptime.alerts.tls.expirationExpression.description',
    {
      defaultMessage: 'has a certificate expiring within',
    }
  ),
  expirationValue: (value?: number) =>
    i18n.translate('xpack.uptime.alerts.tls.expirationExpression.value', {
      defaultMessage: '{value} days',
      values: { value },
    }),
  ageAriaLabel: i18n.translate('xpack.uptime.alerts.tls.ageExpression.ariaLabel', {
    defaultMessage:
      'An expressing displaying the threshold that will trigger the TLS alert for old certificates',
  }),
  ageDescription: i18n.translate('xpack.uptime.alerts.tls.ageExpression.description', {
    defaultMessage: 'or older than',
  }),
  ageValue: (value?: number) =>
    i18n.translate('xpack.uptime.alerts.tls.ageExpression.value', {
      defaultMessage: '{value} days',
      values: { value },
    }),
};

export const ToggleFlyoutTranslations = {
  toggleButtonAriaLabel: i18n.translate('xpack.uptime.alertsPopover.toggleButton.ariaLabel', {
    defaultMessage: 'Open alerts and rules context menu',
  }),
  openAlertContextPanelAriaLabel: i18n.translate('xpack.uptime.openAlertContextPanel.ariaLabel', {
    defaultMessage: 'Open the rule context panel so you can choose a rule type',
  }),
  openAlertContextPanelLabel: i18n.translate('xpack.uptime.openAlertContextPanel.label', {
    defaultMessage: 'Create rule',
  }),
  toggleTlsAriaLabel: i18n.translate('xpack.uptime.toggleTlsAlertButton.ariaLabel', {
    defaultMessage: 'Open TLS rule flyout',
  }),
  toggleTlsContent: i18n.translate('xpack.uptime.toggleTlsAlertButton.content', {
    defaultMessage: 'TLS rule',
  }),
  toggleMonitorStatusAriaLabel: i18n.translate('xpack.uptime.toggleAlertFlyout.ariaLabel', {
    defaultMessage: 'Open add rule flyout',
  }),
  toggleMonitorStatusContent: i18n.translate('xpack.uptime.toggleAlertButton.content', {
    defaultMessage: 'Monitor status rule',
  }),
  navigateToAlertingUIAriaLabel: i18n.translate('xpack.uptime.navigateToAlertingUi', {
    defaultMessage: 'Leave Uptime and go to Alerting Management page',
  }),
  navigateToAlertingButtonContent: i18n.translate('xpack.uptime.navigateToAlertingButton.content', {
    defaultMessage: 'Manage rules',
  }),
  toggleAlertFlyoutButtonLabel: i18n.translate('xpack.uptime.alerts.createRulesPanel.title', {
    defaultMessage: 'Create rules',
  }),
};

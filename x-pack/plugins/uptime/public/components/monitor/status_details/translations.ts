/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const healthStatusMessageAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.healthStatusMessageAriaLabel',
  {
    defaultMessage: 'Monitor status',
  }
);

export const typeLabel = i18n.translate('xpack.uptime.monitorStatusBar.type.label', {
  defaultMessage: 'Type',
});

export const typeAriaLabel = i18n.translate('xpack.uptime.monitorStatusBar.type.ariaLabel', {
  defaultMessage: 'Monitor type',
});

export const monitorUrlLinkAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitorUrlLinkAriaLabel',
  {
    defaultMessage: 'Monitor URL link',
  }
);

export const durationTextAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.durationTextAriaLabel',
  {
    defaultMessage: 'Monitor duration in milliseconds',
  }
);

export const timestampFromNowTextAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.timestampFromNowTextAriaLabel',
  {
    defaultMessage: 'Time since last check',
  }
);

export const loadingMessage = i18n.translate('xpack.uptime.monitorStatusBar.loadingMessage', {
  defaultMessage: 'Loading…',
});

export const MonitorIDLabel = i18n.translate('xpack.uptime.monitorStatusBar.monitor.id', {
  defaultMessage: 'Monitor ID',
});

export const OverallAvailability = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.availability',
  {
    defaultMessage: 'Overall availability',
  }
);

export const MonitoringFrom = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.monitoringFrom',
  {
    defaultMessage: 'Monitoring from',
  }
);

export const ChangeToMapView = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.monitoringFrom.listToMap',
  {
    defaultMessage: 'Change to map view to check availability by location.',
  }
);

export const ChangeToListView = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.monitoringFrom.MapToList',
  {
    defaultMessage: 'Change to list view to check availability by location.',
  }
);

export const LocationLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.availabilityReport.location',
  {
    defaultMessage: 'Location',
  }
);

export const AvailabilityLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.availabilityReport.availability',
  {
    defaultMessage: 'Availability',
  }
);

export const LastCheckLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitor.availabilityReport.lastCheck',
  {
    defaultMessage: 'Last check',
  }
);

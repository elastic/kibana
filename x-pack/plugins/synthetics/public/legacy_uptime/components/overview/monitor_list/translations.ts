/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS_COLUMN_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.statusColumnLabel',
  {
    defaultMessage: 'Status',
  }
);

export const NAME_COLUMN_LABEL = i18n.translate('xpack.synthetics.monitorList.nameColumnLabel', {
  defaultMessage: 'Name',
});

export const HISTORY_COLUMN_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.monitorHistoryColumnLabel',
  {
    defaultMessage: 'Downtime history',
  }
);

export const TLS_COLUMN_LABEL = i18n.translate('xpack.synthetics.monitorList.tlsColumnLabel', {
  defaultMessage: 'TLS Certificate',
});

export const getExpandDrawerLabel = (id: string) => {
  return i18n.translate('xpack.synthetics.monitorList.expandDrawerButton.ariaLabel', {
    defaultMessage: 'Expand row for monitor with ID {id}',
    description: 'The user can click a button on this table and expand further details.',
    values: {
      id,
    },
  });
};

export const getDescriptionLabel = (itemsLength: number) => {
  return i18n.translate('xpack.synthetics.monitorList.table.description', {
    defaultMessage:
      'Monitor Status table with columns for Status, Name, URL, IP, Downtime History and Integrations. The table is currently displaying {length} items.',
    values: { length: itemsLength },
  });
};

export const NO_MONITOR_ITEM_SELECTED = i18n.translate(
  'xpack.synthetics.monitorList.noItemForSelectedFiltersMessage',
  {
    defaultMessage: 'No monitors found for selected filter criteria',
    description:
      'This message is show if there are no monitors in the table and some filter or search criteria exists',
  }
);

export const LOADING = i18n.translate('xpack.synthetics.monitorList.loading', {
  defaultMessage: 'Loading...',
  description: 'Shown when the monitor list is waiting for a server response',
});

export const NO_DATA_MESSAGE = i18n.translate('xpack.synthetics.monitorList.noItemMessage', {
  defaultMessage: 'No uptime monitors found',
  description: 'This message is shown if the monitors table is rendered but has no items.',
});

export const RESPONSE_ANOMALY_SCORE = i18n.translate(
  'xpack.synthetics.monitorList.anomalyColumn.label',
  {
    defaultMessage: 'Response Anomaly Score',
  }
);

export const STATUS_ALERT_COLUMN = i18n.translate(
  'xpack.synthetics.monitorList.statusAlert.label',
  {
    defaultMessage: 'Status alert',
  }
);

export const TEST_NOW_COLUMN = i18n.translate('xpack.synthetics.monitorList.testNow.label', {
  defaultMessage: 'Test now',
});

export const TEST_NOW_AVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.available',
  {
    defaultMessage: 'Test now is only available for monitors added via Monitor Management.',
  }
);

export const TEST_SCHEDULED_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.scheduled',
  {
    defaultMessage: 'Test is already scheduled',
  }
);

export const PRIVATE_AVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.available.private',
  {
    defaultMessage: `You can't currently test monitors running on private locations on demand.`,
  }
);

export const TEST_NOW_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.AriaLabel',
  {
    defaultMessage: 'Click to run test now',
  }
);

export const TEST_NOW_LABEL = i18n.translate('xpack.synthetics.monitorList.testNow.label', {
  defaultMessage: 'Test now',
});

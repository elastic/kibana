/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POPOVER_ID = 'data-stream-selector-popover';
export const INTEGRATION_PANEL_ID = 'integrations_panel';
export const UNCATEGORIZED_STREAMS_PANEL_ID = 'uncategorized_streams_panel';

export const DATA_VIEW_POPOVER_CONTENT_WIDTH = 300;

export const contextMenuStyles = { maxHeight: 320 };

export const selectViewLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.selectView',
  { defaultMessage: 'Select view' }
);

export const integrationsLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.integrations',
  { defaultMessage: 'Integrations' }
);

export const uncategorizedLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.uncategorized',
  { defaultMessage: 'Uncategorized' }
);

export const sortOrdersLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.sortOrders',
  { defaultMessage: 'Sort directions' }
);

export const noDataStreamsLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.noDataStreams',
  { defaultMessage: 'No data streams found' }
);

export const noDataStreamsDescriptionLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.noDataStreamsDescription',
  {
    defaultMessage:
      "Looks like you don't have data stream or your search does not match any of them.",
  }
);

export const errorLabel = i18n.translate('xpack.observabilityLogs.dataStreamSelector.error', {
  defaultMessage: 'error',
});

export const noDataStreamsRetryLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.noDataStreamsRetry',
  {
    defaultMessage: 'Retry',
  }
);

export const sortOptions = [
  {
    id: 'asc',
    iconType: 'sortAscending',
    label: 'Ascending',
  },
  {
    id: 'desc',
    iconType: 'sortDescending',
    label: 'Descending',
  },
];

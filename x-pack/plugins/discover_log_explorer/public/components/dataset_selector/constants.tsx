/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POPOVER_ID = 'dataset-selector-popover';
export const INTEGRATION_PANEL_ID = 'integrations_panel';
export const UNMANAGED_STREAMS_PANEL_ID = 'unmanaged_streams_panel';

export const DATA_VIEW_POPOVER_CONTENT_WIDTH = 300;

export const contextMenuStyles = { maxHeight: 440 };

export const selectDatasetLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.selectDataset',
  { defaultMessage: 'Select dataset' }
);

export const integrationsLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.integrations',
  { defaultMessage: 'Integrations' }
);

export const uncategorizedLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.uncategorized',
  { defaultMessage: 'Uncategorized' }
);

export const sortOrdersLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.sortOrders',
  { defaultMessage: 'Sort directions' }
);

export const noDatasetsLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.noDatasets',
  { defaultMessage: 'No data streams found' }
);

export const noDatasetsDescriptionLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.noDatasetsDescription',
  {
    defaultMessage: 'No datasets or search results found.',
  }
);

export const noIntegrationsLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.noIntegrations',
  { defaultMessage: 'No integrations found' }
);

export const noIntegrationsDescriptionLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.noIntegrationsDescription',
  {
    defaultMessage: 'No integrations or search results found.',
  }
);

export const errorLabel = i18n.translate('xpack.discoverLogExplorer.datasetSelector.error', {
  defaultMessage: 'error',
});

export const noDataRetryLabel = i18n.translate(
  'xpack.discoverLogExplorer.datasetSelector.noDataRetry',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POPOVER_ID = 'dataset-selector-popover';
export const INTEGRATIONS_PANEL_ID = 'dataset-selector-integrations-panel';
export const INTEGRATIONS_TAB_ID = 'dataset-selector-integrations-tab';
export const UNCATEGORIZED_PANEL_ID = 'dataset-selector-uncategorized-panel';
export const UNCATEGORIZED_TAB_ID = 'dataset-selector-uncategorized-tab';
export const DATA_VIEWS_PANEL_ID = 'dataset-selector-data-views-panel';
export const DATA_VIEWS_TAB_ID = 'dataset-selector-data-views-tab';

export const DATA_VIEW_POPOVER_CONTENT_WIDTH = 400;

export const showAllLogsLabel = i18n.translate('xpack.logsExplorer.datasetSelector.showAllLogs', {
  defaultMessage: 'Show all logs',
});

export const integrationsLabel = i18n.translate('xpack.logsExplorer.datasetSelector.integrations', {
  defaultMessage: 'Integrations',
});

export const uncategorizedLabel = i18n.translate(
  'xpack.logsExplorer.datasetSelector.uncategorized',
  { defaultMessage: 'Uncategorized' }
);

export const dataViewsLabel = i18n.translate('xpack.logsExplorer.datasetSelector.dataViews', {
  defaultMessage: 'Data Views',
});

export const openDiscoverLabel = i18n.translate('xpack.logsExplorer.datasetSelector.openDiscover', {
  defaultMessage: 'Opens in Discover',
});

export const sortOrdersLabel = i18n.translate('xpack.logsExplorer.datasetSelector.sortOrders', {
  defaultMessage: 'Sort directions',
});

export const noDatasetsLabel = i18n.translate('xpack.logsExplorer.datasetSelector.noDatasets', {
  defaultMessage: 'No data streams found',
});

export const noDatasetsDescriptionLabel = i18n.translate(
  'xpack.logsExplorer.datasetSelector.noDatasetsDescription',
  {
    defaultMessage: 'No datasets or search results found.',
  }
);

export const noDataViewsLabel = i18n.translate('xpack.logsExplorer.datasetSelector.noDataViews', {
  defaultMessage: 'No data views found',
});

export const noDataViewsDescriptionLabel = i18n.translate(
  'xpack.logsExplorer.datasetSelector.noDataViewsDescription',
  {
    defaultMessage: 'No data views or search results found.',
  }
);

export const noIntegrationsLabel = i18n.translate(
  'xpack.logsExplorer.datasetSelector.noIntegrations',
  { defaultMessage: 'No integrations found' }
);

export const noIntegrationsDescriptionLabel = i18n.translate(
  'xpack.logsExplorer.datasetSelector.noIntegrationsDescription',
  {
    defaultMessage: 'No integrations or search results found.',
  }
);

export const errorLabel = i18n.translate('xpack.logsExplorer.datasetSelector.error', {
  defaultMessage: 'error',
});

export const noDataRetryLabel = i18n.translate('xpack.logsExplorer.datasetSelector.noDataRetry', {
  defaultMessage: 'Retry',
});

export const tryEsql = i18n.translate('xpack.logsExplorer.datasetSelector.TryEsql', {
  defaultMessage: 'Try ES|QL',
});

export const technicalPreview = i18n.translate('xpack.logsExplorer.TechPreview', {
  defaultMessage: 'Technical preview',
});

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

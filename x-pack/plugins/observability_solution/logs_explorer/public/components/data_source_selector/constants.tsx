/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POPOVER_ID = 'data-source-selector-popover';
export const INTEGRATIONS_PANEL_ID = 'data-source-selector-integrations-panel';
export const INTEGRATIONS_TAB_ID = 'data-source-selector-integrations-tab';
export const UNCATEGORIZED_PANEL_ID = 'data-source-selector-uncategorized-panel';
export const UNCATEGORIZED_TAB_ID = 'data-source-selector-uncategorized-tab';
export const DATA_VIEWS_PANEL_ID = 'data-source-selector-data-views-panel';
export const DATA_VIEWS_TAB_ID = 'data-source-selector-data-views-tab';

export const DATA_SOURCE_SELECTOR_WIDTH = 520;

export const showAllLogsLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.showAllLogs',
  { defaultMessage: 'Show all logs' }
);

export const addDataLabel = i18n.translate('xpack.logsExplorer.dataSourceSelector.addDataLabel', {
  defaultMessage: 'Add data',
});

export const integrationsLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.integrations',
  { defaultMessage: 'Integrations' }
);

export const uncategorizedLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.uncategorized',
  { defaultMessage: 'Uncategorized' }
);

export const dataViewsLabel = i18n.translate('xpack.logsExplorer.dataSourceSelector.dataViews', {
  defaultMessage: 'Data Views',
});

export const openDiscoverLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.openDiscover',
  { defaultMessage: 'Opens in Discover' }
);

export const sortOrdersLabel = i18n.translate('xpack.logsExplorer.dataSourceSelector.sortOrders', {
  defaultMessage: 'Sort directions',
});

export const noDatasetsLabel = i18n.translate('xpack.logsExplorer.dataSourceSelector.noDatasets', {
  defaultMessage: 'No data streams found',
});

export const noDatasetsDescriptionLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.noDatasetsDescription',
  { defaultMessage: 'No datasets or search results found.' }
);

export const noDataViewsLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.noDataViews',
  { defaultMessage: 'No data views found' }
);

export const noDataViewsDescriptionLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.noDataViewsDescription',
  { defaultMessage: 'No data views or search results found.' }
);

export const noIntegrationsLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.noIntegrations',
  { defaultMessage: 'No integrations found' }
);

export const noIntegrationsDescriptionLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.noIntegrationsDescription',
  { defaultMessage: 'No integrations or search results found.' }
);

export const errorLabel = i18n.translate('xpack.logsExplorer.dataSourceSelector.error', {
  defaultMessage: 'error',
});

export const noDataRetryLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.noDataRetry',
  { defaultMessage: 'Retry' }
);

export const tryEsql = i18n.translate('xpack.logsExplorer.dataSourceSelector.TryEsql', {
  defaultMessage: 'Language: ES|QL',
});

export const technicalPreview = i18n.translate('xpack.logsExplorer.TechPreview', {
  defaultMessage: 'Technical preview',
});

export const selectDataViewTypeLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.dataViewFilter.selectDataViewType',
  { defaultMessage: 'Select type' }
);

export const allDataViewTypesLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.dataViewFilter.allDataViewTypes',
  { defaultMessage: 'Show all' }
);

export const logsDataViewTypeLabel = i18n.translate(
  'xpack.logsExplorer.dataSourceSelector.dataViewFilter.logsDataViewType',
  { defaultMessage: 'Logs-only' }
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

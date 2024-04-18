/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const datasetQualityAppTitle = i18n.translate('xpack.datasetQuality.appTitle', {
  defaultMessage: 'Datasets',
});

export const noDatasetsDescription = i18n.translate('xpack.datasetQuality.noDatasetsDescription', {
  defaultMessage: 'Try adjusting your time or filter.',
});

export const noDatasetsTitle = i18n.translate('xpack.datasetQuality.noDatasetsTitle', {
  defaultMessage: 'No matching data streams found',
});

export const loadingDatasetsText = i18n.translate('xpack.datasetQuality.loadingDatasetsText', {
  defaultMessage: 'Loading data',
});

export const tableSummaryAllText = i18n.translate('xpack.datasetQuality.tableSummaryAllText', {
  defaultMessage: 'All',
});

export const tableSummaryOfText = i18n.translate('xpack.datasetQuality.tableSummaryOfText', {
  defaultMessage: 'of',
});

/*
Flyout
*/

export const flyoutCancelText = i18n.translate('xpack.datasetQuality.flyoutCancelText', {
  defaultMessage: 'Cancel',
});

export const flyoutOpenInLogsExplorerText = i18n.translate(
  'xpack.datasetQuality.flyoutOpenInLogsExplorerText',
  {
    defaultMessage: 'Open in Logs Explorer',
  }
);

export const flyoutDatasetDetailsText = i18n.translate(
  'xpack.datasetQuality.flyoutDatasetDetailsText',
  {
    defaultMessage: 'Dataset details',
  }
);

export const flyoutDatasetLastActivityText = i18n.translate(
  'xpack.datasetQuality.flyoutDatasetLastActivityText',
  {
    defaultMessage: 'Last Activity',
  }
);

export const flyoutDatasetCreatedOnText = i18n.translate(
  'xpack.datasetQuality.flyoutDatasetCreatedOnText',
  {
    defaultMessage: 'Created on',
  }
);

export const flyoutIntegrationDetailsText = i18n.translate(
  'xpack.datasetQuality.flyoutIntegrationDetailsText',
  {
    defaultMessage: 'Integration details',
  }
);

export const flyoutIntegrationVersionText = i18n.translate(
  'xpack.datasetQuality.flyoutIntegrationVersionText',
  {
    defaultMessage: 'Version',
  }
);

export const flyoutIntegrationNameText = i18n.translate(
  'xpack.datasetQuality.flyoutIntegrationNameText',
  {
    defaultMessage: 'Name',
  }
);

export const flyoutDegradedDocsText = i18n.translate(
  'xpack.datasetQuality.flyout.degradedDocsTitle',
  {
    defaultMessage: 'Degraded docs',
  }
);

export const flyoutDegradedDocsTrendText = i18n.translate(
  'xpack.datasetQuality.flyoutDegradedDocsViz',
  {
    defaultMessage: 'Degraded documents trend',
  }
);

export const flyoutDegradedDocsPercentageText = i18n.translate(
  'xpack.datasetQuality.flyoutDegradedDocsPercentage',
  {
    defaultMessage: 'Degraded docs %',
    description: 'Tooltip label for the percentage of degraded documents chart.',
  }
);

/*
Summary Panel
*/

export const summaryPanelLast24hText = i18n.translate(
  'xpack.datasetQuality.summaryPanelLast24hText',
  {
    defaultMessage: 'Last 24h',
  }
);

export const summaryPanelQualityText = i18n.translate(
  'xpack.datasetQuality.summaryPanelQualityText',
  {
    defaultMessage: 'Datasets Quality',
  }
);

export const summaryPanelQualityTooltipText = i18n.translate(
  'xpack.datasetQuality.summaryPanelQualityTooltipText',
  {
    defaultMessage: 'Quality is based on the percentage of degraded docs in a dataset.',
  }
);

export const summaryPanelQualityPoorText = i18n.translate(
  'xpack.datasetQuality.summaryPanelQualityPoorText',
  {
    defaultMessage: 'Poor',
  }
);

export const summaryPanelQualityDegradedText = i18n.translate(
  'xpack.datasetQuality.summaryPanelQualityDegradedText',
  {
    defaultMessage: 'Degraded',
  }
);

export const summaryPanelQualityGoodText = i18n.translate(
  'xpack.datasetQuality.summaryPanelQualityGoodText',
  {
    defaultMessage: 'Good',
  }
);

export const summaryPanelDatasetsActivityText = i18n.translate(
  'xpack.datasetQuality.summaryPanelDatasetsActivityText',
  {
    defaultMessage: 'Active Datasets',
  }
);

export const summaryPanelDatasetsActivityTooltipText = i18n.translate(
  'xpack.datasetQuality.summaryPanelDatasetsActivityTooltipText',
  {
    defaultMessage: 'The number of datasets with activity in the last 24 hours.',
  }
);

export const summaryPanelEstimatedDataText = i18n.translate(
  'xpack.datasetQuality.summaryPanelEstimatedDataText',
  {
    defaultMessage: 'Estimated Data',
  }
);

export const summaryPanelEstimatedDataTooltipText = i18n.translate(
  'xpack.datasetQuality.summaryPanelEstimatedDataTooltipText',
  {
    defaultMessage: 'The approximate amount of data stored in the last 24 hours.',
  }
);

export const inactiveDatasetsLabel = i18n.translate('xpack.datasetQuality.inactiveDatasetsLabel', {
  defaultMessage: 'Show inactive datasets',
});

export const inactiveDatasetsDescription = i18n.translate(
  'xpack.datasetQuality.inactiveDatasetsDescription',
  {
    defaultMessage:
      'Turn on to show datasets with a Last activity outside of the selected timeframe.',
  }
);

export const fullDatasetNameLabel = i18n.translate('xpack.datasetQuality.fullDatasetNameLabel', {
  defaultMessage: 'Show full dataset names',
});

export const fullDatasetNameDescription = i18n.translate(
  'xpack.datasetQuality.fullDatasetNameDescription',
  {
    defaultMessage: 'Turn on to show the actual dataset names used to store the documents.',
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const datasetQualityAppTitle = i18n.translate('xpack.datasetQuality.appTitle', {
  defaultMessage: 'Data Set Quality',
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

export const flyoutOpenInDiscoverText = i18n.translate(
  'xpack.datasetQuality.flyoutOpenInDiscoverText',
  {
    defaultMessage: 'Open in Discover',
  }
);

export const flyoutDatasetDetailsText = i18n.translate(
  'xpack.datasetQuality.flyoutDatasetDetailsText',
  {
    defaultMessage: 'Data set details',
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

export const flyoutSummaryText = i18n.translate('xpack.datasetQuality.flyoutSummaryTitle', {
  defaultMessage: 'Summary',
});

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

export const flyoutDocsCountTotalText = i18n.translate(
  'xpack.datasetQuality.flyoutDocsCountTotal',
  {
    defaultMessage: 'Docs count (total)',
  }
);

export const flyoutSizeText = i18n.translate('xpack.datasetQuality.flyoutSizeText', {
  defaultMessage: 'Size',
});

export const flyoutServicesText = i18n.translate('xpack.datasetQuality.flyoutServicesText', {
  defaultMessage: 'Services',
});

export const flyoutHostsText = i18n.translate('xpack.datasetQuality.flyoutHostsText', {
  defaultMessage: 'Hosts',
});

export const flyoutShowAllText = i18n.translate('xpack.datasetQuality.flyoutShowAllText', {
  defaultMessage: 'Show all',
});

export const flyoutImprovementText = i18n.translate(
  'xpack.datasetQuality.flyoutDegradedFieldsSectionTitle',
  {
    defaultMessage: 'Degraded fields',
  }
);

export const flyoutImprovementTooltip = i18n.translate(
  'xpack.datasetQuality.flyoutDegradedFieldsSectionTooltip',
  {
    defaultMessage: 'A partial list of degraded fields found in your data set.',
  }
);

export const flyoutDegradedFieldsTableLoadingText = i18n.translate(
  'xpack.datasetQuality.flyoutDegradedFieldsTableLoadingText',
  {
    defaultMessage: 'Loading degraded fields',
  }
);

export const flyoutDegradedFieldsTableNoData = i18n.translate(
  'xpack.datasetQuality.flyoutDegradedFieldsTableNoData',
  {
    defaultMessage: 'No degraded fields found',
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
    defaultMessage: 'Data Sets Quality',
  }
);

export const summaryPanelQualityTooltipText = i18n.translate(
  'xpack.datasetQuality.summaryPanelQualityTooltipText',
  {
    defaultMessage: 'Quality is based on the percentage of degraded docs in a data set.',
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
    defaultMessage: 'Active Data Sets',
  }
);

export const summaryPanelDatasetsActivityTooltipText = i18n.translate(
  'xpack.datasetQuality.summaryPanelDatasetsActivityTooltipText',
  {
    defaultMessage: 'The number of data sets with activity in the selected time range.',
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
    defaultMessage: 'The approximate amount of data stored in the selected time range.',
  }
);

export const inactiveDatasetsLabel = i18n.translate('xpack.datasetQuality.inactiveDatasetsLabel', {
  defaultMessage: 'Show inactive data sets',
});

export const inactiveDatasetsDescription = i18n.translate(
  'xpack.datasetQuality.inactiveDatasetsDescription',
  {
    defaultMessage:
      'Turn on to show datasets with a Last activity outside of the selected timeframe.',
  }
);

export const fullDatasetNameLabel = i18n.translate('xpack.datasetQuality.fullDatasetNameLabel', {
  defaultMessage: 'Show full data set names',
});

export const fullDatasetNameDescription = i18n.translate(
  'xpack.datasetQuality.fullDatasetNameDescription',
  {
    defaultMessage: 'Turn on to show the actual data set names used to store the documents.',
  }
);

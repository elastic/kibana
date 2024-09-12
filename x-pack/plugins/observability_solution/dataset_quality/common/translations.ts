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

export const notAvailableLabel = i18n.translate('xpack.datasetQuality.notAvailableLabel', {
  defaultMessage: 'N/A',
});

/*
Flyout
*/

export const flyoutCancelText = i18n.translate('xpack.datasetQuality.flyoutCancelText', {
  defaultMessage: 'Cancel',
});

export const openInLogsExplorerText = i18n.translate(
  'xpack.datasetQuality.details.openInLogsExplorerText',
  {
    defaultMessage: 'Open in Logs Explorer',
  }
);

export const logsExplorerAriaText = i18n.translate(
  'xpack.datasetQuality.details.logsExplorerAriaText',
  {
    defaultMessage: 'Logs Explorer',
  }
);

export const openInDiscoverText = i18n.translate(
  'xpack.datasetQuality.details.openInDiscoverText',
  {
    defaultMessage: 'Open in Discover',
  }
);

export const discoverAriaText = i18n.translate('xpack.datasetQuality.details.discoverAriaText', {
  defaultMessage: 'Discover',
});

export const flyoutDatasetDetailsText = i18n.translate(
  'xpack.datasetQuality.flyoutDatasetDetailsText',
  {
    defaultMessage: 'Data set details',
  }
);

export const flyoutIntegrationDetailsText = i18n.translate(
  'xpack.datasetQuality.flyoutIntegrationDetailsText',
  {
    defaultMessage: 'Integration details',
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

export const overviewDegradedDocsText = i18n.translate(
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

/*
Dataset Quality Details
*/

export const overviewHeaderTitle = i18n.translate('xpack.datasetQuality.details.overviewTitle', {
  defaultMessage: 'Overview',
});

export const overviewTitleTooltip = i18n.translate(
  'xpack.datasetQuality.details.overviewTitleTooltip',
  {
    defaultMessage: 'Stats of the data set within the selected time range.',
  }
);

export const overviewPanelTitleDocuments = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.documents.title',
  {
    defaultMessage: 'Documents',
  }
);

export const overviewPanelDocumentsIndicatorTotalCount = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.documents.totalCount',
  {
    defaultMessage: 'Total count',
  }
);

export const overviewPanelDocumentsIndicatorSize = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.documents.size',
  {
    defaultMessage: 'Size',
  }
);

export const overviewPanelTitleResources = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.resources.title',
  {
    defaultMessage: 'Resources',
  }
);

export const overviewPanelResourcesIndicatorServices = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.resources.services',
  {
    defaultMessage: 'Services',
  }
);

export const overviewPanelResourcesIndicatorSize = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.resources.hosts',
  {
    defaultMessage: 'Hosts',
  }
);

export const overviewPanelTitleDatasetQuality = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.datasetQuality.title',
  {
    defaultMessage: 'Data set quality',
  }
);

export const overviewPanelDatasetQualityIndicatorDegradedDocs = i18n.translate(
  'xpack.datasetQuality.details.overviewPanel.datasetQuality.degradedDocs',
  {
    defaultMessage: 'Degraded docs',
  }
);

export const overviewDegradedFieldsTableLoadingText = i18n.translate(
  'xpack.datasetQuality.details.degradedFieldsTableLoadingText',
  {
    defaultMessage: 'Loading degraded fields',
  }
);

export const overviewDegradedFieldsTableNoData = i18n.translate(
  'xpack.datasetQuality.details.degradedFieldsTableNoData',
  {
    defaultMessage: 'No degraded fields found',
  }
);

export const overviewDegradedFieldsSectionTitle = i18n.translate(
  'xpack.datasetQuality.detail.degradedFieldsSectionTitle',
  {
    defaultMessage: 'Quality issues',
  }
);

export const overviewDegradedFieldToggleSwitch = i18n.translate(
  'xpack.datasetQuality.details.degradedFieldToggleSwitch',
  {
    defaultMessage: 'Current quality issues only',
  }
);

export const overviewDegradedFieldsSectionTitleTooltip = i18n.translate(
  'xpack.datasetQuality.details.degradedFieldsSectionTooltip',
  {
    defaultMessage: 'A partial list of quality issues found in your data set.',
  }
);

export const overviewQualityIssuesAccordionTechPreviewBadge = i18n.translate(
  'xpack.datasetQuality.details.overviewQualityIssuesAccordionTechPreviewBadge',
  {
    defaultMessage: 'TECH PREVIEW',
  }
);

export const detailsHeaderTitle = i18n.translate('xpack.datasetQuality.details.detailsTitle', {
  defaultMessage: 'Details',
});

export const datasetLastActivityText = i18n.translate(
  'xpack.datasetQuality.details.datasetLastActivityText',
  {
    defaultMessage: 'Last Activity',
  }
);

export const datasetCreatedOnText = i18n.translate(
  'xpack.datasetQuality.details.datasetCreatedOnText',
  {
    defaultMessage: 'Created on',
  }
);

export const integrationNameText = i18n.translate(
  'xpack.datasetQuality.details.integrationnameText',
  {
    defaultMessage: 'Integration',
  }
);

export const integrationVersionText = i18n.translate(
  'xpack.datasetQuality.details.integrationVersionText',
  {
    defaultMessage: 'Version',
  }
);
export const fieldColumnName = i18n.translate('xpack.datasetQuality.details.degradedField.field', {
  defaultMessage: 'Field',
});

export const countColumnName = i18n.translate('xpack.datasetQuality.details.degradedField.count', {
  defaultMessage: 'Docs count',
});

export const lastOccurrenceColumnName = i18n.translate(
  'xpack.datasetQuality.details.degradedField.lastOccurrence',
  {
    defaultMessage: 'Last occurrence',
  }
);

export const degradedFieldValuesColumnName = i18n.translate(
  'xpack.datasetQuality.details.degradedField.values',
  {
    defaultMessage: 'Values',
  }
);

export const fieldIgnoredText = i18n.translate(
  'xpack.datasetQuality.details.degradedField.fieldIgnored',
  {
    defaultMessage: 'field ignored',
  }
);

export const degradedFieldPotentialCauseColumnName = i18n.translate(
  'xpack.datasetQuality.details.degradedField.potentialCause',
  {
    defaultMessage: 'Potential cause',
  }
);

export const degradedFieldCurrentFieldLimitColumnName = i18n.translate(
  'xpack.datasetQuality.details.degradedField.currentFieldLimit',
  {
    defaultMessage: 'Field limit',
  }
);

export const degradedFieldCauseFieldLimitExceeded = i18n.translate(
  'xpack.datasetQuality.details.degradedField.cause.fieldLimitExceeded',
  {
    defaultMessage: 'field limit exceeded',
  }
);

export const degradedFieldCauseFieldIgnored = i18n.translate(
  'xpack.datasetQuality.details.degradedField.cause.fieldIgnored',
  {
    defaultMessage: 'field ignored',
  }
);

export const degradedFieldCauseFieldMalformed = i18n.translate(
  'xpack.datasetQuality.details.degradedField.cause.fieldMalformed',
  {
    defaultMessage: 'field malformed',
  }
);

export const degradedFieldMessageIssueDoesNotExistInLatestIndex = i18n.translate(
  'xpack.datasetQuality.details.degradedField.message.issueDoesNotExistInLatestIndex',
  {
    defaultMessage: 'The issue did not occur on the latest backing index!',
  }
);

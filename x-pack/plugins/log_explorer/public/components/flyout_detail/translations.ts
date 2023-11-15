/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const flyoutMessageLabel = i18n.translate('xpack.logExplorer.flyoutDetail.label.message', {
  defaultMessage: 'Message',
});

export const flyoutServiceLabel = i18n.translate('xpack.logExplorer.flyoutDetail.label.service', {
  defaultMessage: 'Service',
});

export const flyoutTraceLabel = i18n.translate('xpack.logExplorer.flyoutDetail.label.trace', {
  defaultMessage: 'Trace',
});

export const flyoutHostNameLabel = i18n.translate('xpack.logExplorer.flyoutDetail.label.hostName', {
  defaultMessage: 'Host name',
});

export const serviceAccordionTitle = i18n.translate(
  'xpack.logExplorer.flyoutDetail.accordion.title.service',
  {
    defaultMessage: 'Service',
  }
);

export const infraAccordionTitle = i18n.translate(
  'xpack.logExplorer.flyoutDetail.accordion.title.infrastructure',
  {
    defaultMessage: 'Infrastructure',
  }
);

export const cloudAccordionTitle = i18n.translate(
  'xpack.logExplorer.flyoutDetail.accordion.title.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

export const otherAccordionTitle = i18n.translate(
  'xpack.logExplorer.flyoutDetail.accordion.title.other',
  {
    defaultMessage: 'Other',
  }
);

export const flyoutOrchestratorClusterNameLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

export const flyoutOrchestratorResourceIdLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

export const flyoutCloudProviderLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

export const flyoutCloudRegionLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.cloudRegion',
  {
    defaultMessage: 'Cloud region',
  }
);

export const flyoutCloudAvailabilityZoneLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

export const flyoutCloudProjectIdLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

export const flyoutCloudInstanceIdLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

export const flyoutLogPathFileLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.logPathFile',
  {
    defaultMessage: 'Log path file',
  }
);

export const flyoutNamespaceLabel = i18n.translate(
  'xpack.logExplorer.flyoutDetail.label.namespace',
  {
    defaultMessage: 'Namespace',
  }
);

export const flyoutDatasetLabel = i18n.translate('xpack.logExplorer.flyoutDetail.label.dataset', {
  defaultMessage: 'Dataset',
});

export const flyoutShipperLabel = i18n.translate('xpack.logExplorer.flyoutDetail.label.shipper', {
  defaultMessage: 'Shipper',
});

export const flyoutHoverActionFilterForText = (text: unknown) =>
  i18n.translate('xpack.logExplorer.flyoutDetail.value.hover.filterFor', {
    defaultMessage: 'Filter for this {value}',
    values: {
      value: text as string,
    },
  });

export const flyoutHoverActionFilterOutText = (text: unknown) =>
  i18n.translate('xpack.logExplorer.flyoutDetail.value.hover.filterOut', {
    defaultMessage: 'Filter out this {value}',
    values: {
      value: text as string,
    },
  });

export const flyoutHoverActionFilterForFieldPresentText = i18n.translate(
  'xpack.logExplorer.flyoutDetail.value.hover.filterForFieldPresent',
  {
    defaultMessage: 'Filter for field present',
  }
);

export const flyoutHoverActionToggleColumnText = i18n.translate(
  'xpack.logExplorer.flyoutDetail.value.hover.toggleColumn',
  {
    defaultMessage: 'Toggle column in table',
  }
);

export const flyoutHoverActionCopyToClipboardText = i18n.translate(
  'xpack.logExplorer.flyoutDetail.value.hover.copyToClipboard',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

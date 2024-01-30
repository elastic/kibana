/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const flyoutContentLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.message', {
  defaultMessage: 'Content breakdown',
});

export const contentLabel = i18n.translate('xpack.logsExplorer.dataTable.header.popover.content', {
  defaultMessage: 'Content',
});

export const resourceLabel = i18n.translate(
  'xpack.logsExplorer.dataTable.header.popover.resource',
  {
    defaultMessage: 'Resource',
  }
);

export const markerLabel = i18n.translate('xpack.logsExplorer.dataTable.header.popover.marker', {
  defaultMessage: 'Marker',
});

export const markerLabelLowerCase = i18n.translate(
  'xpack.logsExplorer.dataTable.header.popover.marker.lowercase',
  {
    defaultMessage: 'marker',
  }
);

export const flyoutServiceLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.service', {
  defaultMessage: 'Service',
});

export const flyoutTraceLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.trace', {
  defaultMessage: 'Trace',
});

export const flyoutHostNameLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.hostName',
  {
    defaultMessage: 'Host name',
  }
);

export const serviceInfraAccordionTitle = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.accordion.title.serviceInfra',
  {
    defaultMessage: 'Service & Infrastructure',
  }
);

export const cloudAccordionTitle = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.accordion.title.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

export const otherAccordionTitle = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.accordion.title.other',
  {
    defaultMessage: 'Other',
  }
);

export const flyoutOrchestratorClusterNameLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

export const flyoutOrchestratorResourceIdLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

export const flyoutCloudProviderLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

export const flyoutCloudRegionLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudRegion',
  {
    defaultMessage: 'Cloud region',
  }
);

export const flyoutCloudAvailabilityZoneLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

export const flyoutCloudProjectIdLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

export const flyoutCloudInstanceIdLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

export const flyoutLogPathFileLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.logPathFile',
  {
    defaultMessage: 'Log path file',
  }
);

export const flyoutNamespaceLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.namespace',
  {
    defaultMessage: 'Namespace',
  }
);

export const flyoutDatasetLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.dataset', {
  defaultMessage: 'Dataset',
});

export const flyoutShipperLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.shipper', {
  defaultMessage: 'Shipper',
});

export const actionFilterForText = (text: string) =>
  i18n.translate('xpack.logsExplorer.flyoutDetail.value.hover.filterFor', {
    defaultMessage: 'Filter for this {value}',
    values: {
      value: text,
    },
  });

export const actionFilterOutText = (text: string) =>
  i18n.translate('xpack.logsExplorer.flyoutDetail.value.hover.filterOut', {
    defaultMessage: 'Filter out this {value}',
    values: {
      value: text,
    },
  });

export const filterOutText = i18n.translate('xpack.logsExplorer.popoverAction.filterOut', {
  defaultMessage: 'Filter out',
});

export const filterForText = i18n.translate('xpack.logsExplorer.popoverAction.filterFor', {
  defaultMessage: 'Filter for',
});

export const flyoutHoverActionFilterForFieldPresentText = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.value.hover.filterForFieldPresent',
  {
    defaultMessage: 'Filter for field present',
  }
);

export const flyoutHoverActionToggleColumnText = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.value.hover.toggleColumn',
  {
    defaultMessage: 'Toggle column in table',
  }
);

export const flyoutHoverActionCopyToClipboardText = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.value.hover.copyToClipboard',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const copyValueText = i18n.translate('xpack.logsExplorer.popoverAction.copyValue', {
  defaultMessage: 'Copy value',
});

export const copyValueAriaText = (fieldName: string) =>
  i18n.translate('xpack.logsExplorer.popoverAction.copyValueAriaText', {
    defaultMessage: 'Copy value of {fieldName}',
    values: {
      fieldName,
    },
  });

export const flyoutAccordionShowMoreText = (count: number) =>
  i18n.translate('xpack.logsExplorer.flyoutDetail.section.showMore', {
    defaultMessage: '+ {hiddenCount} more',
    values: {
      hiddenCount: count,
    },
  });

export const openCellActionPopoverAriaText = i18n.translate(
  'xpack.logsExplorer.popoverAction.openPopover',
  {
    defaultMessage: 'Open popover',
  }
);

export const closeCellActionPopoverText = i18n.translate(
  'xpack.logsExplorer.popoverAction.closePopover',
  {
    defaultMessage: 'Close popover',
  }
);

export const contentHeaderTooltipParagraph1 = i18n.translate(
  'xpack.logsExplorer.dataTable.header.content.tooltip.paragraph1',
  {
    defaultMessage: "Fields that provide information on the document's source, such as:",
  }
);

export const contentHeaderTooltipParagraph2 = i18n.translate(
  'xpack.logsExplorer.dataTable.header.content.tooltip.paragraph2',
  {
    defaultMessage: 'When the message field is empty, one of the following is displayed',
  }
);

export const resourceHeaderTooltipParagraph = i18n.translate(
  'xpack.logsExplorer.dataTable.header.resource.tooltip.paragraph',
  {
    defaultMessage: "Fields that provide information on the document's source, such as:",
  }
);

export const markerHeaderTooltipParagraph = i18n.translate(
  'xpack.logsExplorer.dataTable.header.marker.tooltip.paragraph',
  {
    defaultMessage: 'Fields that provide actionable information, such as:',
  }
);

export const markerHeaderTooltipExpandAction = i18n.translate(
  'xpack.logsExplorer.dataTable.header.marker.tooltip.expand',
  { defaultMessage: 'Expand log details' }
);

export const markerHeaderTooltipMalformedAction = (
  <FormattedMessage
    id="xpack.logsExplorer.dataTable.controlColumn.marker.button.malformedDoc"
    defaultMessage="Access to malformed doc with {ignoredProperty} field"
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

export const markerHeaderTooltipStacktraceAction = i18n.translate(
  'xpack.logsExplorer.dataTable.header.marker.tooltip.stacktrace',
  { defaultMessage: 'Access to available stacktraces based on:' }
);

export const malformedDocButtonLabelWhenPresent = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.marker.button.malformedDocPresent',
  {
    defaultMessage:
      "This document couldn't be parsed correctly. Not all fields are properly populated",
  }
);

export const malformedDocButtonLabelWhenNotPresent = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.marker.button.malformedDocNotPresent',
  {
    defaultMessage: 'All fields in this document were parsed correctly',
  }
);

export const stacktraceAvailableControlButton = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.marker.button.stacktrace.available',
  {
    defaultMessage: 'Stacktraces available',
  }
);

export const stacktraceNotAvailableControlButton = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.marker.button.stacktrace.notAvailable',
  {
    defaultMessage: 'Stacktraces not available',
  }
);

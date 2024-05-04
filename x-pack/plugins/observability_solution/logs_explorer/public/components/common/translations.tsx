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

export const contentLabel = i18n.translate('xpack.logsExplorer.dataTable.header.popover.content', {
  defaultMessage: 'Content',
});

export const resourceLabel = i18n.translate(
  'xpack.logsExplorer.dataTable.header.popover.resource',
  {
    defaultMessage: 'Resource',
  }
);

export const actionsLabel = i18n.translate('xpack.logsExplorer.dataTable.header.popover.actions', {
  defaultMessage: 'Actions',
});

export const actionsLabelLowerCase = i18n.translate(
  'xpack.logsExplorer.dataTable.header.popover.actions.lowercase',
  {
    defaultMessage: 'actions',
  }
);

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

export const contentHeaderTooltipParagraph1 = (
  <FormattedMessage
    id="xpack.logsExplorer.dataTable.header.content.tooltip.paragraph1"
    defaultMessage="Displays the document's {logLevel} and {message} fields."
    values={{
      // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
      logLevel: <strong>log.level</strong>,
      // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
      message: <strong>message</strong>,
    }}
  />
);

export const contentHeaderTooltipParagraph2 = i18n.translate(
  'xpack.logsExplorer.dataTable.header.content.tooltip.paragraph2',
  {
    defaultMessage: 'When the message field is empty, one of the following is displayed:',
  }
);

export const resourceHeaderTooltipParagraph = i18n.translate(
  'xpack.logsExplorer.dataTable.header.resource.tooltip.paragraph',
  {
    defaultMessage: "Fields that provide information on the document's source, such as:",
  }
);

export const actionsHeaderTooltipParagraph = i18n.translate(
  'xpack.logsExplorer.dataTable.header.actions.tooltip.paragraph',
  {
    defaultMessage: 'Fields that provide actionable information, such as:',
  }
);

export const actionsHeaderTooltipExpandAction = i18n.translate(
  'xpack.logsExplorer.dataTable.header.actions.tooltip.expand',
  { defaultMessage: 'Expand log details' }
);

export const actionsHeaderTooltipDegradedAction = (
  <FormattedMessage
    id="xpack.logsExplorer.dataTable.controlColumn.actions.button.degradedDoc"
    defaultMessage="Access to degraded doc with {ignoredProperty} field"
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

export const actionsHeaderTooltipStacktraceAction = i18n.translate(
  'xpack.logsExplorer.dataTable.header.actions.tooltip.stacktrace',
  { defaultMessage: 'Access to available stacktraces based on:' }
);

export const degradedDocButtonLabelWhenPresent = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.actions.button.degradedDocPresent',
  {
    defaultMessage:
      "This document couldn't be parsed correctly. Not all fields are properly populated",
  }
);

export const degradedDocButtonLabelWhenNotPresent = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.actions.button.degradedDocNotPresent',
  {
    defaultMessage: 'All fields in this document were parsed correctly',
  }
);

export const stacktraceAvailableControlButton = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.actions.button.stacktrace.available',
  {
    defaultMessage: 'Stacktraces available',
  }
);

export const stacktraceNotAvailableControlButton = i18n.translate(
  'xpack.logsExplorer.dataTable.controlColumn.actions.button.stacktrace.notAvailable',
  {
    defaultMessage: 'Stacktraces not available',
  }
);

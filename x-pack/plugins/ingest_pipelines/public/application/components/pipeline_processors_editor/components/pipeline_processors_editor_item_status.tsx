/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { ProcessorStatus } from '../types';

interface ProcessorStatusIcon {
  icon: string;
  iconColor: string;
  label: string;
}

const processorStatusToIconMap: Record<ProcessorStatus, ProcessorStatusIcon> = {
  success: {
    icon: 'checkInCircleFilled',
    iconColor: 'success',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.successStatusAriaLabel', {
      defaultMessage: 'Success',
    }),
  },
  error: {
    icon: 'crossInACircleFilled',
    iconColor: 'danger',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.errorStatusAriaLabel', {
      defaultMessage: 'Error',
    }),
  },
  error_ignored: {
    icon: 'alert',
    iconColor: 'warning',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.errorIgnoredStatusAriaLabel', {
      defaultMessage: 'Error ignored',
    }),
  },
  dropped: {
    icon: 'alert',
    iconColor: 'warning',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.droppedStatusAriaLabel', {
      defaultMessage: 'Dropped',
    }),
  },
  skipped: {
    icon: 'dot',
    iconColor: 'subdued',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.skippedStatusAriaLabel', {
      defaultMessage: 'Skipped',
    }),
  },
  inactive: {
    icon: 'dot',
    iconColor: 'subdued',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.inactiveStatusAriaLabel', {
      defaultMessage: 'Not run',
    }),
  },
};

// This is a fallback in case ES returns a status we do not support
// This is not expected and likely means we need to modify the code to support a new status
const unknownStatus = {
  icon: 'dot',
  iconColor: 'subdued',
  label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.unknownStatusAriaLabel', {
    defaultMessage: 'Unknown',
  }),
};

interface Props {
  processorStatus: ProcessorStatus;
}

export const PipelineProcessorsItemStatus: FunctionComponent<Props> = ({ processorStatus }) => {
  const { icon, iconColor, label } = processorStatusToIconMap[processorStatus] || unknownStatus;

  return (
    <EuiToolTip position="top" content={<p>{label}</p>}>
      <EuiIcon
        color={iconColor}
        type={icon}
        aria-label={label}
        size="s"
        data-test-subj="processorStatusIcon"
      />
    </EuiToolTip>
  );
};

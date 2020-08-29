/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon, IconType } from '@elastic/eui';
import { ProcessorStatus } from '../types';

interface ProcessorStatusIcon {
  icon: IconType;
  iconColor: string;
  label: string;
}

const ErrorIgnoredIcon: FunctionComponent = () => (
  <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.69297 4.58336L6.89831 8.76292H7.59296L7.80703 4.58336H6.69297ZM6.85273 10.2326C6.95924 10.3391 7.08717 10.3924 7.23653 10.3924C7.37855 10.3924 7.50342 10.3397 7.61115 10.2345C7.71889 10.1292 7.77275 10.0019 7.77275 9.8525C7.77275 9.70069 7.7195 9.57276 7.61299 9.4687C7.50648 9.36464 7.38099 9.31261 7.23653 9.31261C7.08717 9.31261 6.95924 9.36525 6.85273 9.47053C6.74622 9.57582 6.69297 9.70314 6.69297 9.8525C6.69297 9.99941 6.74622 10.1261 6.85273 10.2326ZM1.35585 10.8733C1.04436 11.4443 1.45769 12.1406 2.10818 12.1406H8.38069C8.31594 11.8631 8.2743 11.5767 8.25791 11.2836H2.10818L7.25 1.85697L10.1132 7.10614C10.3362 6.92628 10.5749 6.76519 10.827 6.62525L8.00233 1.44661C7.67752 0.851131 6.82248 0.851131 6.49767 1.44661L1.35585 10.8733Z"
      fill="#BD271E"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.25 6C10.0409 6 8.25 7.79086 8.25 10C8.25 12.2091 10.0409 14 12.25 14C14.4591 14 16.25 12.2091 16.25 10C16.25 7.79086 14.4591 6 12.25 6ZM12.632 11.0522L14.5087 9.28831L15.0441 9.8565L12.25 12.4813L9.45584 9.8565L9.99126 9.28831L11.8515 11.0367V7.51871H12.632V11.0522Z"
      fill="#BD271E"
    />
  </svg>
);

const SkippedIcon: FunctionComponent = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.00586 2C2.94746 2 2.08199 2.81827 2.0055 3.85616L2 4.00586V9.99414C2 11.0525 2.81827 11.918 3.85616 11.9945L4 11.9998L4.00417 11.9999L4.00586 12L12.5167 11.9999L10.6067 13.8199C10.553 13.8687 10.5101 13.9281 10.4807 13.9944C10.4514 14.0607 10.4362 14.1324 10.4362 14.2049C10.4362 14.2774 10.4514 14.3492 10.4807 14.4155C10.5101 14.4818 10.553 14.5412 10.6067 14.5899C10.8337 14.8029 11.2067 14.8029 11.4347 14.5899L13.4847 12.6399C13.6468 12.4944 13.7765 12.3163 13.8653 12.1173C13.9541 11.9183 14 11.7028 14 11.4849C14 11.267 13.9541 11.0516 13.8653 10.8526C13.7765 10.6536 13.6468 10.4755 13.4847 10.3299L11.4347 8.37994C11.3212 8.27699 11.1734 8.21997 11.0202 8.21997C10.8669 8.21997 10.7192 8.27699 10.6057 8.37994C10.552 8.42868 10.5091 8.48811 10.4797 8.55441C10.4504 8.62072 10.4352 8.69243 10.4352 8.76494C10.4352 8.83745 10.4504 8.90916 10.4797 8.97546C10.5091 9.04177 10.552 9.1012 10.6057 9.14994L12.5487 10.9999H4C3.48642 10.997 3.0646 10.6103 3.00676 10.1116L3 9.99414V4.00586C3 3.48963 3.38781 3.06482 3.88845 3.00676L4.00586 3H13.5C13.7761 3 14 2.77614 14 2.5C14 2.25454 13.8231 2.05039 13.5899 2.00806L13.5 2H4.00586Z"
      fill="#69707D"
    />
  </svg>
);

const ErrorIcon: FunctionComponent = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.1221 12.5211C0.758621 13.1875 1.24093 14 1.99999 14H14C14.7591 14 15.2414 13.1875 14.8779 12.5211L8.87789 1.52115C8.49887 0.826284 7.50112 0.826284 7.1221 1.52115L1.1221 12.5211ZM7.34999 5.18143L7.5896 10.0586H8.40019L8.64999 5.18143H7.34999ZM7.53642 11.7736C7.66071 11.8979 7.80999 11.96 7.98428 11.96C8.14999 11.96 8.2957 11.8986 8.42142 11.7757C8.54713 11.6529 8.60999 11.5043 8.60999 11.33C8.60999 11.1529 8.54785 11.0036 8.42356 10.8822C8.29928 10.7607 8.15285 10.7 7.98428 10.7C7.80999 10.7 7.66071 10.7614 7.53642 10.8843C7.41213 11.0072 7.34999 11.1557 7.34999 11.33C7.34999 11.5014 7.41213 11.6493 7.53642 11.7736Z"
      fill="#BD271E"
    />
  </svg>
);

const processorStatusToIconMap: Record<ProcessorStatus, ProcessorStatusIcon> = {
  success: {
    icon: 'check',
    iconColor: 'success',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.successStatusAriaLabel', {
      defaultMessage: 'Success',
    }),
  },
  error: {
    icon: ErrorIcon,
    iconColor: 'danger',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.errorStatusAriaLabel', {
      defaultMessage: 'Error',
    }),
  },
  error_ignored: {
    icon: ErrorIgnoredIcon,
    iconColor: 'danger',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.errorIgnoredStatusAriaLabel', {
      defaultMessage: 'Error ignored',
    }),
  },
  dropped: {
    icon: 'indexClose',
    iconColor: 'warning',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditorItem.droppedStatusAriaLabel', {
      defaultMessage: 'Dropped',
    }),
  },
  skipped: {
    icon: SkippedIcon,
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
      <EuiIcon color={iconColor} type={icon} aria-label={label} size="s" />
    </EuiToolTip>
  );
};

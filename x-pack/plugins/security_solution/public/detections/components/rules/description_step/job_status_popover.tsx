/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiButton,
  EuiText,
} from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import * as i18n from './translations';

interface JobStatusPopoverComponentProps {
  job: MlSummaryJob;
}

const JobStatusPopoverComponent: React.FC<JobStatusPopoverComponentProps> = ({ job }) => {
  const isStarted = isJobStarted(job.jobState, job.datafeedState);
  const color = isStarted ? 'success' : 'danger';
  const text = isStarted ? i18n.ML_JOB_STARTED : i18n.ML_JOB_STOPPED;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((open) => !open && !isStarted);
  const closePopover = () => setIsPopoverOpen(false);
  const button = (
    <EuiBadge
      data-test-subj="machineLearningJobStatus"
      color={color}
      onClick={onButtonClick}
      onClickAriaLabel={'jobStatusBadgeButton'}
    >
      {text}
    </EuiBadge>
  );
  const { navigateToApp } = useKibana().services.application;

  const handleGoToMlPageClick = () => {
    onButtonClick();
    navigateToApp('ml', {
      openInNewTab: true,
    });
  };

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{i18n.JOB_FAILED_STATUS_POPOVER_TITLE(job.id)}</EuiPopoverTitle>
      <div style={{ width: '500px' }}>
        <EuiText size="s">
          <p>{i18n.JOB_FAILED_STATUS_POPOVER_DESCRIPTION}</p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiButton fullWidth size="s" onClick={handleGoToMlPageClick}>
          {i18n.GO_TO_ML_PAGE_BUTTON_LABEL}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const JobStatusPopover = React.memo(JobStatusPopoverComponent);

JobStatusPopover.displayName = 'JobStatusPopover';

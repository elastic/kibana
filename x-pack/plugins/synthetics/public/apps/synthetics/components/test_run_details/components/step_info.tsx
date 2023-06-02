/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { parseBadgeStatus, StatusBadge } from '../../common/monitor_test_result/status_badge';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_time_formats';
import { ErrorDetailsButton } from '../../common/links/error_details_link';
import { StepDetailsLinkIcon } from '../../common/links/step_details_link';
import { JourneyStep } from '../../../../../../common/runtime_types';

export const StepMetaInfo = ({
  step,
  stepIndex,
  stateId,
}: {
  step?: JourneyStep;
  stepIndex: number;
  stateId?: string;
}) => {
  const { checkGroupId, monitorId } = useParams<{ checkGroupId: string; monitorId: string }>();

  if (!step) {
    return (
      <EuiFlexItem grow={true}>
        <EuiSkeletonText lines={4} />
      </EuiFlexItem>
    );
  }

  const isFailed = step.synthetics.step?.status === 'failed';

  return (
    <EuiFlexItem grow={true}>
      <EuiTitle size="xxs">
        <h3>{STEP_NAME}</h3>
      </EuiTitle>
      <EuiText size="m">{step?.synthetics.step?.name}</EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap={false}>
        <EuiFlexItem grow={false}>
          <StatusBadge status={parseBadgeStatus(step?.synthetics.step?.status)} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          {AFTER_LABEL}
          {formatTestDuration(step?.synthetics.step?.duration.us)}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" wrap>
        {isFailed && stateId && (
          <EuiFlexItem grow={false}>
            <ErrorDetailsButton configId={monitorId} stateId={stateId} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <StepDetailsLinkIcon
            asButton
            checkGroup={checkGroupId ?? step.monitor.check_group}
            configId={monitorId}
            stepIndex={stepIndex}
            label={VIEW_PERFORMANCE}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const STEP_NAME = i18n.translate('xpack.synthetics.testDetails.stepName', {
  defaultMessage: 'Step name',
});

const AFTER_LABEL = i18n.translate('xpack.synthetics.testDetails.after', {
  defaultMessage: 'After ',
});

const VIEW_PERFORMANCE = i18n.translate('xpack.synthetics.monitor.step.viewPerformanceBreakdown', {
  defaultMessage: 'View performance breakdown',
});

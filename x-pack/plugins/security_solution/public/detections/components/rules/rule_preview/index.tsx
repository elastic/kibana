/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Unit } from '@kbn/datemath';
import { ThreatMapping, Type } from '@kbn/securitysolution-io-ts-alerting-types';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { useSecurityJobs } from '../../../../../public/common/components/ml_popover/hooks/use_security_jobs';
import { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';
import { usePreviewRoute } from './use_preview_route';
import { PreviewHistogram } from './preview_histogram';
import { getTimeframeOptions } from './helpers';
import { PreviewLogsComponent } from './preview_logs';
import { useKibana } from '../../../../common/lib/kibana';
import { LoadingHistogram } from './loading_histogram';
import { FieldValueThreshold } from '../threshold_input';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';

export interface RulePreviewProps {
  index: string[];
  isDisabled: boolean;
  query: FieldValueQueryBar;
  ruleType: Type;
  threatIndex: string[];
  threatMapping: ThreatMapping;
  threatQuery: FieldValueQueryBar;
  threshold: FieldValueThreshold;
  machineLearningJobId: string[];
  anomalyThreshold: number;
}

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

const defaultTimeRange: Unit = 'h';

const RulePreviewComponent: React.FC<RulePreviewProps> = ({
  index,
  isDisabled,
  query,
  ruleType,
  threatIndex,
  threatQuery,
  threatMapping,
  threshold,
  machineLearningJobId,
  anomalyThreshold,
}) => {
  const { spaces } = useKibana().services;
  const { loading: isMlLoading, jobs } = useSecurityJobs(false);

  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const areRelaventMlJobsRunning = useMemo(() => {
    if (ruleType !== 'machine_learning') {
      return true; // Don't do the expensive logic if we don't need it
    }
    if (isMlLoading) {
      const selectedJobs = jobs.filter(({ id }) => machineLearningJobId.includes(id));
      return selectedJobs.every((job) => isJobStarted(job.jobState, job.datafeedState));
    }
  }, [jobs, machineLearningJobId, ruleType, isMlLoading]);

  const [timeFrame, setTimeFrame] = useState<Unit>(defaultTimeRange);
  const {
    addNoiseWarning,
    createPreview,
    isPreviewRequestInProgress,
    previewId,
    logs,
    hasNoiseWarning,
    isAborted,
  } = usePreviewRoute({
    index,
    isDisabled,
    query,
    threatIndex,
    threatQuery,
    timeFrame,
    ruleType,
    threatMapping,
    threshold,
    machineLearningJobId,
    anomalyThreshold,
  });

  // Resets the timeFrame to default when rule type is changed because not all time frames are supported by all rule types
  useEffect(() => {
    setTimeFrame(defaultTimeRange);
  }, [ruleType]);

  return (
    <>
      <EuiFormRow
        label={i18n.QUERY_PREVIEW_LABEL}
        helpText={i18n.QUERY_PREVIEW_HELP_TEXT}
        error={undefined}
        isInvalid={false}
        data-test-subj="rule-preview"
        describedByIds={['rule-preview']}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Select
              id="preview-time-frame"
              options={getTimeframeOptions(ruleType)}
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as Unit)}
              aria-label={i18n.QUERY_PREVIEW_SELECT_ARIA}
              disabled={isDisabled}
              data-test-subj="preview-time-frame"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewButton
              fill
              isLoading={isPreviewRequestInProgress}
              isDisabled={isDisabled || !areRelaventMlJobsRunning}
              onClick={createPreview}
              data-test-subj="queryPreviewButton"
            >
              {i18n.QUERY_PREVIEW_BUTTON}
            </PreviewButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="s" />
      {isPreviewRequestInProgress && <LoadingHistogram />}
      {!isPreviewRequestInProgress && previewId && spaceId && (
        <PreviewHistogram
          ruleType={ruleType}
          timeFrame={timeFrame}
          previewId={previewId}
          addNoiseWarning={addNoiseWarning}
          spaceId={spaceId}
          threshold={threshold}
          index={index}
        />
      )}
      <PreviewLogsComponent logs={logs} hasNoiseWarning={hasNoiseWarning} isAborted={isAborted} />
    </>
  );
};

export const RulePreview = React.memo(RulePreviewComponent);

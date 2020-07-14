/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import styled from 'styled-components';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { useSiemJobs } from '../../../../common/components/ml_popover/hooks/use_siem_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import {
  ML_JOB_SELECT_PLACEHOLDER_TEXT,
  ENABLE_ML_JOB_WARNING,
} from '../step_define_rule/translations';

const HelpTextWarningContainer = styled.div`
  margin-top: 10px;
`;

const MlJobSelectEuiFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 5px;
`;

const HelpText: React.FC<{ href: string; showEnableWarning: boolean }> = ({
  href,
  showEnableWarning = false,
}) => (
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningJobIdHelpText"
      defaultMessage="We've provided a few common jobs to get you started. To add your own custom jobs, assign a group of “siem” to those jobs in the {machineLearning} application to make them appear here."
      values={{
        machineLearning: (
          <EuiLink href={href} target="_blank">
            <FormattedMessage
              id="xpack.securitySolution.components.mlJobSelect.machineLearningLink"
              defaultMessage="Machine Learning"
            />
          </EuiLink>
        ),
      }}
    />
    {showEnableWarning && (
      <HelpTextWarningContainer>
        <EuiText size="xs" color="warning">
          <EuiIcon type="alert" />
          <span>{ENABLE_ML_JOB_WARNING}</span>
        </EuiText>
      </HelpTextWarningContainer>
    )}
  </>
);

const JobDisplay: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <>
    <strong>{title}</strong>
    <EuiText size="xs" color="subdued">
      <p>{description}</p>
    </EuiText>
  </>
);

interface MlJobSelectProps {
  describedByIds: string[];
  field: FieldHook;
}

export const MlJobSelect: React.FC<MlJobSelectProps> = ({ describedByIds = [], field }) => {
  const jobId = field.value as string;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [isLoading, siemJobs] = useSiemJobs(false);
  const mlUrl = useKibana().services.application.getUrlForApp('ml');
  const handleJobChange = useCallback(
    (machineLearningJobId: string) => {
      field.setValue(machineLearningJobId);
    },
    [field]
  );
  const placeholderOption = {
    value: 'placeholder',
    inputDisplay: ML_JOB_SELECT_PLACEHOLDER_TEXT,
    dropdownDisplay: ML_JOB_SELECT_PLACEHOLDER_TEXT,
    disabled: true,
  };

  const jobOptions = siemJobs.map((job) => ({
    value: job.id,
    inputDisplay: job.id,
    dropdownDisplay: <JobDisplay title={job.id} description={job.description} />,
  }));

  const options = [placeholderOption, ...jobOptions];

  const isJobRunning = useMemo(() => {
    // If the selected job is not found in the list, it means the placeholder is selected
    // and so we don't want to show the warning, thus isJobRunning will be true when 'job == null'
    const job = siemJobs.find((j) => j.id === jobId);
    return job == null || isJobStarted(job.jobState, job.datafeedState);
  }, [siemJobs, jobId]);

  return (
    <MlJobSelectEuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          label={field.label}
          helpText={<HelpText href={mlUrl} showEnableWarning={!isJobRunning} />}
          isInvalid={isInvalid}
          error={errorMessage}
          data-test-subj="mlJobSelect"
          describedByIds={describedByIds}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSuperSelect
                hasDividers
                isLoading={isLoading}
                onChange={handleJobChange}
                options={options}
                valueOfSelected={jobId || 'placeholder'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiFlexItem>
    </MlJobSelectEuiFlexGroup>
  );
};

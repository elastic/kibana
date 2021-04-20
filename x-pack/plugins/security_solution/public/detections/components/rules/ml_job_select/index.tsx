/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import styled from 'styled-components';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import {
  ML_JOB_SELECT_PLACEHOLDER_TEXT,
  ENABLE_ML_JOB_WARNING,
} from '../step_define_rule/translations';

interface MlJobValue {
  id: string;
  description: string;
}

type MlJobOption = EuiComboBoxOptionOption<MlJobValue>;

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
      defaultMessage="We've provided a few common jobs to get you started. To add your own custom jobs, assign a group of “security” to those jobs in the {machineLearning} application to make them appear here."
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

const JobDisplay: React.FC<MlJobValue> = ({ id, description }) => (
  <>
    <strong>{id}</strong>
    <EuiText size="xs" color="subdued">
      <p>{description}</p>
    </EuiText>
  </>
);

interface MlJobSelectProps {
  describedByIds: string[];
  field: FieldHook;
}

const renderJobOption = (option: MlJobOption) => (
  <JobDisplay id={option.value!.id} description={option.value!.description} />
);

export const MlJobSelect: React.FC<MlJobSelectProps> = ({ describedByIds = [], field }) => {
  const jobIds = field.value as string[];
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { loading, jobs } = useSecurityJobs(false);
  const mlUrl = useKibana().services.application.getUrlForApp('ml');
  const handleJobSelect = useCallback(
    (selectedJobOptions: MlJobOption[]): void => {
      const selectedJobIds = selectedJobOptions.map((option) => option.value!.id);
      field.setValue(selectedJobIds);
    },
    [field]
  );

  const jobOptions = jobs.map((job) => ({
    value: {
      id: job.id,
      description: job.description,
    },
    label: job.id,
  }));

  const selectedJobOptions = jobOptions.filter((option) => jobIds.includes(option.value.id));

  const allJobsRunning = useMemo(() => {
    const selectedJobs = jobs.filter(({ id }) => jobIds.includes(id));
    return selectedJobs.every((job) => isJobStarted(job.jobState, job.datafeedState));
  }, [jobs, jobIds]);

  return (
    <MlJobSelectEuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          label={field.label}
          helpText={<HelpText href={mlUrl} showEnableWarning={!allJobsRunning} />}
          isInvalid={isInvalid}
          error={errorMessage}
          data-test-subj="mlJobSelect"
          describedByIds={describedByIds}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiComboBox
                isLoading={loading}
                onChange={handleJobSelect}
                options={jobOptions}
                placeholder={ML_JOB_SELECT_PLACEHOLDER_TEXT}
                renderOption={renderJobOption}
                rowHeight={50}
                selectedOptions={selectedJobOptions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiFlexItem>
    </MlJobSelectEuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';

import styled from 'styled-components';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import { HelpText } from './help_text';

import * as i18n from './translations';
import { MlJobComboBox } from './ml_job_combobox';

const MlJobSelectEuiFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 5px;
`;

const MlJobEuiButton = styled(EuiButton)`
  margin-top: 20px;
`;

interface MlJobSelectProps {
  describedByIds: string[];
  field: FieldHook;
}

export const MlJobSelect: React.FC<MlJobSelectProps> = ({ describedByIds = [], field }) => {
  const jobIds = field.value as string[];
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { loading, jobs } = useSecurityJobs();
  const { getUrlForApp, navigateToApp } = useKibana().services.application;
  const mlUrl = getUrlForApp('ml');

  const notRunningJobIds = useMemo<string[]>(() => {
    const selectedJobs = jobs.filter(({ id }) => jobIds.includes(id));
    return selectedJobs.reduce((acc, job) => {
      if (!isJobStarted(job.jobState, job.datafeedState)) {
        acc.push(job.id);
      }
      return acc;
    }, [] as string[]);
  }, [jobs, jobIds]);

  return (
    <MlJobSelectEuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={field.label}
          helpText={<HelpText href={mlUrl} notRunningJobIds={notRunningJobIds} />}
          isInvalid={isInvalid}
          error={errorMessage}
          data-test-subj="mlJobSelect"
          describedByIds={describedByIds}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <MlJobComboBox field={field} isLoading={loading} jobs={jobs} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MlJobEuiButton
          iconType="popout"
          iconSide="right"
          onClick={() => navigateToApp('ml', { openInNewTab: true })}
        >
          {i18n.CREATE_CUSTOM_JOB_BUTTON_TITLE}
        </MlJobEuiButton>
      </EuiFlexItem>
    </MlJobSelectEuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { EuiComboBox, EuiToolTip, EuiText } from '@elastic/eui';
import type { MlJobOption, MlJobValue } from './types';
import type { FieldHook } from '../../../../shared_imports';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import * as i18n from './translations';

interface MlJobComboBoxProps {
  field: FieldHook;
  isLoading: boolean;
  jobs: SecurityJob[];
}

export function MlJobComboBox({ field, isLoading, jobs }: MlJobComboBoxProps) {
  const jobIds = field.value as string[];

  const jobOptions = jobs.map((job) => ({
    value: {
      id: job.id,
      description: job.description,
      name: job.customSettings?.security_app_display_name,
    },
    // Make sure users can search for id or name.
    // The label contains the name and id because EuiComboBox uses it for the textual search.
    label: `${job.customSettings?.security_app_display_name} ${job.id}`,
  }));

  const handleJobSelect = useCallback(
    (selectedJobOptions: MlJobOption[]): void => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const selectedJobIds = selectedJobOptions.map((option) => option.value!.id);
      field.setValue(selectedJobIds);
    },
    [field]
  );

  const selectedJobOptions = jobOptions
    .filter((option) => jobIds.includes(option.value.id))
    // 'label' defines what is rendered inside the selected ComboBoxPill
    .map((options) => ({ ...options, label: options.value.name ?? options.value.id }));

  return (
    <EuiComboBox
      isLoading={isLoading}
      onChange={handleJobSelect}
      options={jobOptions}
      placeholder={i18n.ML_JOB_SELECT_PLACEHOLDER_TEXT}
      renderOption={renderJobOption}
      rowHeight={50}
      selectedOptions={selectedJobOptions}
    />
  );
}

const renderJobOption = (option: MlJobOption) => (
  <JobDisplay
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id={option.value!.id}
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    description={option.value!.description}
    name={option.value?.name}
  />
);

const JobDisplay: React.FC<MlJobValue> = ({ description, name, id }) => (
  <JobDisplayContainer>
    <strong>{name ?? id}</strong>
    <EuiToolTip content={description}>
      <EuiText size="xs" color="subdued">
        <p>{description}</p>
      </EuiText>
    </EuiToolTip>
  </JobDisplayContainer>
);

const JobDisplayContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

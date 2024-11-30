/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { HelpText } from './help_text';
import * as i18n from './translations';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import type { MlJobOption, MlJobValue } from './types';
import * as styles from './styles';

interface MlJobSelectProps {
  field: FieldHook<string[]>;
  shouldShowHelpText?: boolean;
  loading: boolean;
  jobs: SecurityJob[];
}

export const MlJobSelect: React.FC<MlJobSelectProps> = ({
  field,
  shouldShowHelpText = true,
  loading,
  jobs,
}) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const selectedJobIds = field.value;

  const handleJobSelect = (selectedJobOptions: MlJobOption[]): void => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newlySelectedJobIds = selectedJobOptions.map((option) => option.value!.id);
    field.setValue(newlySelectedJobIds);
  };

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

  const selectedJobOptions = jobOptions
    .filter((option) => selectedJobIds.includes(option.value.id))
    // 'label' defines what is rendered inside the selected ComboBoxPill
    .map((options) => ({ ...options, label: options.value.name ?? options.value.id }));

  return (
    <EuiFlexGroup justifyContent="flexStart" className={styles.mlJobSelectClassName}>
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={field.label}
          helpText={shouldShowHelpText && <HelpText jobs={jobs} selectedJobIds={selectedJobIds} />}
          isInvalid={isInvalid}
          error={errorMessage}
          data-test-subj="mlJobSelect"
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiComboBox
                isLoading={loading}
                onChange={handleJobSelect}
                options={jobOptions}
                placeholder={i18n.ML_JOB_SELECT_PLACEHOLDER_TEXT}
                renderOption={renderJobOption}
                rowHeight={50}
                selectedOptions={selectedJobOptions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
  <div className={styles.jobDisplayClassName}>
    <strong>{name ?? id}</strong>
    <EuiToolTip content={description}>
      <EuiText size="xs" color="subdued">
        <p>{description}</p>
      </EuiText>
    </EuiToolTip>
  </div>
);

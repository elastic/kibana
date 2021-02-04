/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps, EuiFormRow } from '@elastic/eui';
import { JobId } from '../../common/types/anomaly_detection_jobs';
import { MlApiServices } from '../application/services/ml_api_service';

interface JobSelection {
  jobIds?: JobId[];
  groupIds?: string[];
}

export interface JobSelectorControlProps {
  jobSelection?: JobSelection;
  onSelectionChange: (jobSelection: JobSelection) => void;
  adJobsApiService: MlApiServices['jobs'];
}

export const JobSelectorControl: FC<JobSelectorControlProps> = ({
  jobSelection,
  onSelectionChange,
  adJobsApiService,
}) => {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const jobIds = useMemo(() => new Set(), []);
  const groupIds = useMemo(() => new Set(), []);

  const fetchOptions = useCallback(async () => {
    try {
      const {
        jobIds: jobIdOptions,
        groupIds: groupIdOptions,
      } = await adJobsApiService.getAllJobAndGroupIds();

      jobIdOptions.forEach((v) => {
        jobIds.add(v);
      });
      groupIdOptions.forEach((v) => {
        groupIds.add(v);
      });

      setOptions([
        {
          label: i18n.translate('xpack.ml.jobSelector.jobOptionsLabel', {
            defaultMessage: 'Jobs',
          }),
          options: jobIdOptions.map((v) => ({ label: v })),
        },
        {
          label: i18n.translate('xpack.ml.jobSelector.groupOptionsLabel', {
            defaultMessage: 'Groups',
          }),
          options: groupIdOptions.map((v) => ({ label: v })),
        },
      ]);
    } catch (e) {
      // TODO add error handling
    }
  }, [adJobsApiService]);

  const onChange: EuiComboBoxProps<string>['onChange'] = useCallback(
    (selectedOptions) => {
      const selectedJobIds: JobId[] = [];
      const selectedGroupIds: string[] = [];
      selectedOptions.forEach(({ label }: { label: string }) => {
        if (jobIds.has(label)) {
          selectedJobIds.push(label);
        } else if (groupIds.has(label)) {
          selectedGroupIds.push(label);
        }
      });
      onSelectionChange({
        ...(selectedJobIds.length > 0 ? { jobIds: selectedJobIds } : {}),
        ...(selectedGroupIds.length > 0 ? { groupIds: selectedGroupIds } : {}),
      });
    },
    [jobIds, groupIds]
  );

  useEffect(() => {
    fetchOptions();
  }, []);

  const selectedOptions = Object.values(jobSelection ?? {})
    .flat()
    .map((v) => ({
      label: v,
    }));

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.ml.jobSelector.formControlLabel"
          defaultMessage="Select jobs or groups"
        />
      }
    >
      <EuiComboBox<string>
        selectedOptions={selectedOptions}
        options={options}
        onChange={onChange}
        fullWidth
        data-test-subj={'mlAnomalyAlertJobSelection'}
      />
    </EuiFormRow>
  );
};

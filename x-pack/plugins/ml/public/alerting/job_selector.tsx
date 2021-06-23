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
  jobsAndGroupIds?: string[];
  onChange: (jobSelection: JobSelection) => void;
  adJobsApiService: MlApiServices['jobs'];
  /**
   * Validation is handled by alerting framework
   */
  errors: string[];
}

export const JobSelectorControl: FC<JobSelectorControlProps> = ({
  jobsAndGroupIds,
  onChange,
  adJobsApiService,
  errors,
}) => {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const jobIds = useMemo(() => new Set(), []);
  const groupIds = useMemo(() => new Set(), []);

  const selectedOptions = useMemo(
    () =>
      (jobsAndGroupIds ?? []).map((v) => ({
        label: v,
      })),
    [jobsAndGroupIds]
  );

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
      ]);
    } catch (e) {
      // TODO add error handling
    }
  }, [adJobsApiService]);

  const onSelectionChange: EuiComboBoxProps<string>['onChange'] = useCallback(
    (selectionUpdate) => {
      const selectedJobIds: JobId[] = [];
      const selectedGroupIds: string[] = [];
      selectionUpdate.forEach(({ label }: { label: string }) => {
        if (jobIds.has(label)) {
          selectedJobIds.push(label);
        } else if (groupIds.has(label)) {
          selectedGroupIds.push(label);
        }
      });
      onChange({
        ...(selectedJobIds.length > 0 ? { jobIds: selectedJobIds } : {}),
        ...(selectedGroupIds.length > 0 ? { groupIds: selectedGroupIds } : {}),
      });
    },
    [jobIds, groupIds]
  );

  useEffect(() => {
    fetchOptions();
  }, []);

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage id="xpack.ml.jobSelector.formControlLabel" defaultMessage="Select job" />
      }
      isInvalid={!!errors?.length}
      error={errors}
    >
      <EuiComboBox<string>
        singleSelection
        selectedOptions={selectedOptions}
        options={options}
        onChange={onSelectionChange}
        fullWidth
        data-test-subj={'mlAnomalyAlertJobSelection'}
        isInvalid={!!errors?.length}
      />
    </EuiFormRow>
  );
};

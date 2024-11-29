/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { EuiButton, EuiComboBox, EuiEmptyPrompt, EuiFormRow } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { useMlKibana } from '../application/contexts/kibana';
import type { JobId } from '../../common/types/anomaly_detection_jobs';
import type { MlApi } from '../application/services/ml_api_service';
import { ALL_JOBS_SELECTION } from '../../common/constants/alerts';
import { LoadingIndicator } from '../application/components/loading_indicator';

export interface JobSelection {
  jobIds?: JobId[];
  groupIds?: string[];
}

export interface JobSelectorControlProps {
  jobsAndGroupIds?: string[];
  onChange: (jobSelection: JobSelection) => void;
  adJobsApiService: MlApi['jobs'];
  /**
   * Validation is handled by alerting framework
   */
  errors?: string[];
  /** Enables multiple selection of jobs and groups */
  multiSelect?: boolean;
  label?: ReactNode;
  /**
   * Allows selecting all jobs, even those created afterward.
   */
  allowSelectAll?: boolean;
  /** Adds an option to create a new anomaly detection job */
  createJobUrl?: string;
  /**
   * Available options to select. By default suggest all existing jobs.
   */
  options?: Array<EuiComboBoxOptionOption<string>>;
  /**
   * Flag to indicate whether to use the job creation button in the empty prompt or the dropdown when no jobs are available.
   */
  shouldUseDropdownJobCreate?: boolean;
}

export const JobSelectorControl: FC<JobSelectorControlProps> = ({
  jobsAndGroupIds,
  onChange,
  adJobsApiService,
  errors,
  multiSelect = false,
  label,
  allowSelectAll = false,
  createJobUrl,
  options: defaultOptions,
  shouldUseDropdownJobCreate = false,
}) => {
  const {
    services: {
      notifications: { toasts },
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const isMounted = useMountedState();

  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [areJobsLoading, setAreJobsLoading] = useState<boolean>(false);
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
    setAreJobsLoading(true);
    try {
      const { jobIds: jobIdOptions, groupIds: groupIdOptions } =
        await adJobsApiService.getAllJobAndGroupIds();

      jobIdOptions.forEach((v) => {
        jobIds.add(v);
      });

      groupIdOptions.forEach((v) => {
        groupIds.add(v);
      });

      if (!isMounted()) return;

      setOptions([
        ...(allowSelectAll
          ? [
              {
                label: i18n.translate('xpack.ml.jobSelector.selectAllGroupLabel', {
                  defaultMessage: 'Select all',
                }),
                options: [
                  {
                    label: i18n.translate('xpack.ml.jobSelector.selectAllOptionLabel', {
                      defaultMessage: '*',
                    }),
                    value: ALL_JOBS_SELECTION,
                  },
                ],
              },
            ]
          : []),

        {
          label: i18n.translate('xpack.ml.jobSelector.jobOptionsLabel', {
            defaultMessage: 'Jobs',
          }),
          options: [
            ...(createJobUrl
              ? [
                  {
                    label: i18n.translate('xpack.ml.jobSelector.createNewLabel', {
                      defaultMessage: '--- Create new ---',
                    }),
                    value: 'createNew',
                  },
                ]
              : []),
            ...jobIdOptions.map((v) => ({ label: v })),
          ],
        },
        ...(multiSelect
          ? [
              {
                label: i18n.translate('xpack.ml.jobSelector.groupOptionsLabel', {
                  defaultMessage: 'Groups',
                }),
                options: groupIdOptions.map((v) => ({ label: v })),
              },
            ]
          : []),
      ]);
    } catch (e) {
      toasts.addError(e, {
        title: i18n.translate('xpack.ml.jobSelector.fetchJobErrorTitle', {
          defaultMessage: 'Failed to load anomaly detection jobs',
        }),
      });
    }
    setAreJobsLoading(false);
  }, [
    adJobsApiService,
    allowSelectAll,
    createJobUrl,
    groupIds,
    isMounted,
    jobIds,
    multiSelect,
    toasts,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSelectionChange: EuiComboBoxProps<string>['onChange'] = useCallback(
    (async (selectionUpdate) => {
      if (selectionUpdate.some((selectedOption) => selectedOption.value === ALL_JOBS_SELECTION)) {
        onChange({ jobIds: [ALL_JOBS_SELECTION] });
        return;
      }

      if (
        !!createJobUrl &&
        selectionUpdate.some((selectedOption) => selectedOption.value === 'createNew')
      ) {
        // Redirect to the job wizard page
        await navigateToUrl(createJobUrl);
        return;
      }

      const selectedJobIds: JobId[] = [];
      const selectedGroupIds: string[] = [];
      selectionUpdate.forEach(({ label: selectedLabel }: { label: string }) => {
        if (jobIds.has(selectedLabel)) {
          selectedJobIds.push(selectedLabel);
        } else if (groupIds.has(selectedLabel)) {
          selectedGroupIds.push(selectedLabel);
        } else if (defaultOptions?.some((v) => v.options?.some((o) => o.label === selectedLabel))) {
          selectedJobIds.push(selectedLabel);
        }
      });
      onChange({
        ...(selectedJobIds.length > 0 ? { jobIds: selectedJobIds } : {}),
        ...(selectedGroupIds.length > 0 ? { groupIds: selectedGroupIds } : {}),
      });
    }) as Exclude<EuiComboBoxProps<string>['onChange'], undefined>,
    [jobIds, groupIds, defaultOptions, createJobUrl]
  );

  useEffect(() => {
    if (defaultOptions) return;
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createJobUrl]);

  if (areJobsLoading === true) return <LoadingIndicator />;

  return jobIds.size || shouldUseDropdownJobCreate ? (
    <EuiFormRow
      data-test-subj="mlAnomalyJobSelectionControls"
      fullWidth
      label={
        label ?? (
          <FormattedMessage
            id="xpack.ml.jobSelector.formControlLabel"
            defaultMessage="Select job"
          />
        )
      }
      isInvalid={!!errors?.length}
      error={errors}
    >
      <EuiComboBox<string>
        singleSelection={!multiSelect}
        selectedOptions={selectedOptions}
        options={defaultOptions ?? options}
        onChange={onSelectionChange}
        fullWidth
        data-test-subj={'mlAnomalyAlertJobSelection'}
        isInvalid={!!errors?.length}
      />
    </EuiFormRow>
  ) : (
    <EuiEmptyPrompt
      data-test-subj="mlAnomalyJobSelectionControls"
      titleSize="xxs"
      iconType="warning"
      title={
        <h4>
          <FormattedMessage
            id="xpack.ml.embeddables.jobSelector.noJobsFoundTitle"
            defaultMessage="No anomaly detection jobs found"
          />
        </h4>
      }
      body={
        <EuiButton
          fill
          color="primary"
          onClick={() => navigateToUrl(createJobUrl!)}
          disabled={createJobUrl === undefined}
        >
          <FormattedMessage
            id="xpack.ml.embeddables.jobSelector.createJobButtonLabel"
            defaultMessage="Create job"
          />
        </EuiButton>
      }
    />
  );
};

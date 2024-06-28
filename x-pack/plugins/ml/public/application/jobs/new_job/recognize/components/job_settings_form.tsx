/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiButton,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTextAlign,
} from '@elastic/eui';
import { getTimeFilterRange, useTimefilter } from '@kbn/ml-date-picker';
import { useDataSource } from '../../../../contexts/ml/data_source_context';
import type { ModuleJobUI } from '../page';
import { SAVE_STATE } from '../page';
import {
  composeValidators,
  maxLengthValidator,
  patternValidator,
} from '../../../../../../common/util/validators';
import { JOB_ID_MAX_LENGTH } from '../../../../../../common/constants/validation';
import type { TimeRange } from '../../common/components';
import { TimeRangePicker } from '../../common/components';

export interface JobSettingsFormValues {
  jobPrefix: string;
  startDatafeedAfterSave: boolean;
  useFullIndexData: boolean;
  timeRange: TimeRange;
  useDedicatedIndex: boolean;
}

interface JobSettingsFormProps {
  saveState: SAVE_STATE;
  onSubmit: (values: JobSettingsFormValues) => void;
  onJobPrefixChange: (jobPrefix: string) => void;
  jobs: ModuleJobUI[];
}

export const JobSettingsForm: FC<JobSettingsFormProps> = ({
  onSubmit,
  onJobPrefixChange,
  saveState,
  jobs,
}) => {
  const timefilter = useTimefilter();
  const { from, to } = getTimeFilterRange(timefilter);
  const { selectedDataView: dataView } = useDataSource();

  const jobPrefixValidator = useMemo(
    () =>
      composeValidators(
        patternValidator(/^([a-z0-9]+[a-z0-9\-_]*)?$/),
        maxLengthValidator(JOB_ID_MAX_LENGTH - Math.max(...jobs.map(({ id }) => id.length)))
      ),
    [jobs]
  );

  const [jobPrefix, setJobPrefix] = useState('');
  const [startDatafeedAfterSave, setStartDatafeedAfterSave] = useState(true);
  const [useFullIndexData, setUseFullIndexData] = useState(true);
  const [timeRange, setTimeRange] = useState({
    start: from,
    end: to,
  });
  const [useDedicatedIndex, setUseDedicatedIndex] = useState(false);
  const [validationResult, setValidationResult] = useState<Record<string, any>>({});

  const createJobSettings = () => {
    return {
      jobPrefix,
      startDatafeedAfterSave,
      useFullIndexData,
      timeRange,
      useDedicatedIndex,
    };
  };

  const handleValidation = useCallback(() => {
    const jobPrefixValidationResult = jobPrefixValidator(jobPrefix);

    setValidationResult({
      jobPrefix: jobPrefixValidationResult,
      formValid: !jobPrefixValidationResult,
    });
  }, [jobPrefix, jobPrefixValidator]);

  useEffect(() => {
    handleValidation();
    onJobPrefixChange(jobPrefix);
  }, [handleValidation, jobPrefix, onJobPrefixChange]);

  return (
    <>
      <EuiForm>
        <EuiDescribedFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.ml.newJob.recognize.jobIdPrefixLabel"
                defaultMessage="Job ID prefix"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.ml.tooltips.newJobRecognizerJobPrefixTooltip"
              defaultMessage="The prefix is added to the beginning of each job ID."
            />
          }
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.newJob.recognize.jobIdPrefixLabel"
                defaultMessage="Job ID prefix"
              />
            }
            isInvalid={!!validationResult.jobPrefix}
            error={
              <>
                {validationResult.jobPrefix && validationResult.jobPrefix.maxLength ? (
                  <div>
                    <FormattedMessage
                      id="xpack.ml.newJob.recognize.jobPrefixInvalidMaxLengthErrorMessage"
                      defaultMessage="Job ID prefix must be no more than {maxLength, plural, one {# character} other {# characters}} long."
                      values={{
                        maxLength: validationResult.jobPrefix.maxLength.requiredLength,
                      }}
                    />
                  </div>
                ) : null}
                {validationResult.jobPrefix && validationResult.jobPrefix.pattern && (
                  <div>
                    <FormattedMessage
                      id="xpack.ml.newJob.recognize.jobLabelAllowedCharactersDescription"
                      defaultMessage="Job label can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; must start and end with an alphanumeric character"
                    />
                  </div>
                )}
              </>
            }
          >
            <EuiFieldText
              name="jobPrefix"
              value={jobPrefix}
              onChange={({ target: { value } }) => setJobPrefix(value)}
              isInvalid={!!validationResult.jobPrefix}
              data-test-subj="mlJobRecognizerWizardInputJobIdPrefix"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiSpacer size="l" />
        <EuiFormRow>
          <EuiSwitch
            id="startDataFeed"
            name="startDataFeed"
            label={
              <FormattedMessage
                id="xpack.ml.newJob.recognize.startDatafeedAfterSaveLabel"
                defaultMessage="Start datafeed after save"
              />
            }
            checked={startDatafeedAfterSave}
            onChange={({ target: { checked } }) => {
              setStartDatafeedAfterSave(checked);
            }}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiSwitch
            id="useFullData"
            name="useFullData"
            label={
              <FormattedMessage
                id="xpack.ml.newJob.recognize.useFullDataLabel"
                defaultMessage="Use full {dataViewIndexPattern} data"
                values={{ dataViewIndexPattern: dataView.getIndexPattern() }}
              />
            }
            checked={useFullIndexData}
            onChange={({ target: { checked } }) => {
              setUseFullIndexData(checked);
            }}
          />
        </EuiFormRow>
        {!useFullIndexData && (
          <>
            <EuiSpacer size="m" />
            <TimeRangePicker setTimeRange={setTimeRange} timeRange={timeRange} />
          </>
        )}
        <EuiSpacer size="l" />
        <EuiAccordion
          id="advancedOptions"
          aria-label={i18n.translate('xpack.ml.newJob.recognize.advancedSettingsAriaLabel', {
            defaultMessage: 'Advanced settings',
          })}
          buttonContent={
            <FormattedMessage
              id="xpack.ml.newJob.recognize.advancedLabel"
              defaultMessage="Advanced"
            />
          }
          paddingSize="l"
          data-test-subj="mlJobWizardToggleAdvancedSection"
        >
          <EuiDescribedFormGroup
            title={
              <h4>
                <FormattedMessage
                  id="xpack.ml.newJob.recognize.useDedicatedIndexLabel"
                  defaultMessage="Use dedicated index"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.ml.tooltips.newJobDedicatedIndexTooltip"
                defaultMessage="Store results in a separate index for this job."
              />
            }
          >
            <EuiFormRow
              describedByIds={['ml_aria_label_new_job_dedicated_index']}
              data-test-subj="mlJobWizardAdvancedSection"
            >
              <EuiSwitch
                id="useDedicatedIndex"
                name="useDedicatedIndex"
                checked={useDedicatedIndex}
                onChange={({ target: { checked } }) => {
                  setUseDedicatedIndex(checked);
                }}
                label={i18n.translate('xpack.ml.newJob.recognize.useDedicatedIndexLabel', {
                  defaultMessage: 'Use dedicated index',
                })}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiAccordion>
        <EuiSpacer size="l" />
      </EuiForm>
      <EuiTextAlign textAlign="right">
        <EuiButton
          fill
          type="submit"
          isLoading={saveState === SAVE_STATE.SAVING}
          disabled={!validationResult.formValid || saveState === SAVE_STATE.SAVING}
          onClick={() => {
            onSubmit(createJobSettings());
          }}
          aria-label={i18n.translate('xpack.ml.newJob.recognize.createJobButtonAriaLabel', {
            defaultMessage: 'Create job',
          })}
        >
          <FormattedMessage
            id="xpack.ml.newJob.recognize.createJobButtonLabel"
            defaultMessage="Create {numberOfJobs, plural, zero {job} one {job} other {jobs}}"
            values={{ numberOfJobs: jobs.length }}
          />
        </EuiButton>
      </EuiTextAlign>
    </>
  );
};

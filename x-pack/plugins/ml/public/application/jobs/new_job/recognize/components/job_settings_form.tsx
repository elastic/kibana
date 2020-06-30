/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { ModuleJobUI, SAVE_STATE } from '../page';
import { getTimeFilterRange } from '../../../../components/full_time_range_selector';
import { useMlContext } from '../../../../contexts/ml';
import {
  composeValidators,
  maxLengthValidator,
  patternValidator,
} from '../../../../../../common/util/validators';
import { JOB_ID_MAX_LENGTH } from '../../../../../../common/constants/validation';
import { usePartialState } from '../../../../components/custom_hooks';
import { TimeRange, TimeRangePicker } from '../../common/components';

export interface JobSettingsFormValues {
  jobPrefix: string;
  startDatafeedAfterSave: boolean;
  useFullIndexData: boolean;
  timeRange: TimeRange;
  useDedicatedIndex: boolean;
}

interface JobSettingsFormProps {
  saveState: SAVE_STATE;
  onSubmit: (values: JobSettingsFormValues) => any;
  onChange: (values: JobSettingsFormValues) => any;
  jobs: ModuleJobUI[];
}

export const JobSettingsForm: FC<JobSettingsFormProps> = ({
  onSubmit,
  onChange,
  saveState,
  jobs,
}) => {
  const { from, to } = getTimeFilterRange();
  const { currentIndexPattern: indexPattern } = useMlContext();

  const jobPrefixValidator = composeValidators(
    patternValidator(/^([a-z0-9]+[a-z0-9\-_]*)?$/),
    maxLengthValidator(JOB_ID_MAX_LENGTH - Math.max(...jobs.map(({ id }) => id.length)))
  );

  const [formState, setFormState] = usePartialState({
    jobPrefix: '',
    startDatafeedAfterSave: true,
    useFullIndexData: true,
    timeRange: {
      start: from,
      end: to,
    },
    useDedicatedIndex: false,
  });
  const [validationResult, setValidationResult] = useState<Record<string, any>>({});

  const onJobPrefixChange = (value: string) => {
    setFormState({
      jobPrefix: value && value.toLowerCase(),
    });
  };

  const handleValidation = () => {
    const jobPrefixValidationResult = jobPrefixValidator(formState.jobPrefix);

    setValidationResult({
      jobPrefix: jobPrefixValidationResult,
      formValid: !jobPrefixValidationResult,
    });
  };

  useEffect(() => {
    handleValidation();
  }, [formState.jobPrefix]);

  useEffect(() => {
    onChange(formState);
  }, [formState]);

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
              value={formState.jobPrefix}
              onChange={({ target: { value } }) => onJobPrefixChange(value)}
              isInvalid={!!validationResult.jobPrefix}
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
            checked={formState.startDatafeedAfterSave}
            onChange={({ target: { checked } }) => {
              setFormState({
                startDatafeedAfterSave: checked,
              });
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
                defaultMessage="Use full {indexPatternTitle} data"
                values={{ indexPatternTitle: indexPattern.title }}
              />
            }
            checked={formState.useFullIndexData}
            onChange={({ target: { checked } }) => {
              setFormState({
                useFullIndexData: checked,
              });
            }}
          />
        </EuiFormRow>
        {!formState.useFullIndexData && (
          <>
            <EuiSpacer size="m" />
            <TimeRangePicker
              setTimeRange={(value) => {
                setFormState({
                  timeRange: value,
                });
              }}
              timeRange={formState.timeRange}
            />
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
            <EuiFormRow describedByIds={['ml_aria_label_new_job_dedicated_index']}>
              <EuiSwitch
                id="useDedicatedIndex"
                name="useDedicatedIndex"
                checked={formState.useDedicatedIndex}
                onChange={({ target: { checked } }) => {
                  setFormState({
                    useDedicatedIndex: checked,
                  });
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
          disabled={!validationResult.formValid}
          onClick={() => {
            onSubmit(formState);
          }}
          aria-label={i18n.translate('xpack.ml.newJob.recognize.createJobButtonAriaLabel', {
            defaultMessage: 'Create job',
          })}
        >
          {saveState === SAVE_STATE.NOT_SAVED && (
            <FormattedMessage
              id="xpack.ml.newJob.recognize.createJobButtonLabel"
              defaultMessage="Create {numberOfJobs, plural, zero {Job} one {Job} other {Jobs}}"
              values={{ numberOfJobs: jobs.length }}
            />
          )}
          {saveState === SAVE_STATE.SAVING && (
            <FormattedMessage
              id="xpack.ml.newJob.recognize.analysisRunningLabel"
              defaultMessage="Analysis running"
            />
          )}
        </EuiButton>
      </EuiTextAlign>
    </>
  );
};

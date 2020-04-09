/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ModuleJobUI } from '../page';
import { usePartialState } from '../../../../components/custom_hooks';
import { composeValidators, maxLengthValidator } from '../../../../../../common/util/validators';
import { isJobIdValid } from '../../../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../../../common/constants/validation';
import { JobGroupsInput } from '../../common/components';
import { JobOverride } from '../../../../../../common/types/modules';

interface EditJobProps {
  job: ModuleJobUI;
  jobOverride: JobOverride | undefined;
  existingGroupIds: string[];
  onClose: (job: JobOverride | null) => void;
}

/**
 * Edit job flyout for overriding job configuration.
 */
export const EditJob: FC<EditJobProps> = ({ job, jobOverride, existingGroupIds, onClose }) => {
  const [formState, setFormState] = usePartialState({
    jobGroups: (jobOverride && jobOverride.groups) || job.config.groups,
  });
  const [validationResult, setValidationResult] = useState<Record<string, any>>({});

  const groupValidator = composeValidators(
    (value: string) => (isJobIdValid(value) ? null : { pattern: true }),
    maxLengthValidator(JOB_ID_MAX_LENGTH)
  );

  const handleValidation = () => {
    const jobGroupsValidationResult = formState.jobGroups
      .map(group => groupValidator(group))
      .filter(result => result !== null);

    setValidationResult({
      jobGroups: jobGroupsValidationResult,
      formValid: jobGroupsValidationResult.length === 0,
    });
  };

  useEffect(() => {
    handleValidation();
  }, [formState.jobGroups]);

  const onSave = () => {
    const result: JobOverride = {
      job_id: job.id,
      groups: formState.jobGroups,
    };
    onClose(result);
  };

  return (
    <EuiFlyout onClose={() => onClose(null)}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.ml.newJob.recognize.overrideConfigurationHeader"
              defaultMessage="Override configuration for {jobID}"
              values={{ jobID: job.id }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSpacer size="m" />
        <EuiForm>
          <EuiFormRow fullWidth>
            <JobGroupsInput
              existingGroups={existingGroupIds}
              selectedGroups={formState.jobGroups}
              onChange={value => {
                setFormState({
                  jobGroups: value,
                });
              }}
              validation={{
                valid: !validationResult.jobGroups || validationResult.jobGroups.length === 0,
                message: (
                  <FormattedMessage
                    id="xpack.ml.newJob.recognize.jobGroupAllowedCharactersDescription"
                    defaultMessage="Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; must start and end with an alphanumeric character"
                  />
                ),
              }}
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={() => onClose(null)} flush="left">
              <FormattedMessage
                id="xpack.ml.newJob.recognize.cancelJobOverrideLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => onSave()} fill disabled={!validationResult.formValid}>
              <FormattedMessage
                id="xpack.ml.newJob.recognize.saveJobOverrideLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { isJobIdValid } from '../../../../../common/util/job_utils';
import { useMlApiContext } from '../../../contexts/kibana';
import { JOB_ID_MAX_LENGTH } from '../../../../../common/constants/validation';
import { JobType } from '../../../../../common/types/saved_objects';

interface Props {
  jobType: JobType;
  id: string;
  index: number;
  disabled: boolean;
  renameJob(index: number, id: string): void;
  setIsValid(index: number, valid: VALIDATION_STATUS): void;
}

export enum VALIDATION_STATUS {
  VALID,
  INVALID,
  VALIDATING,
}

const jobEmpty = i18n.translate(
  'xpack.ml.newJob.wizard.validateJob.jobNameAllowedCharactersDescription',
  {
    defaultMessage: 'Enter a valid job ID',
  }
);
const jobInvalid = i18n.translate(
  'xpack.ml.newJob.wizard.validateJob.jobNameAllowedCharactersDescription',
  {
    defaultMessage:
      'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
      'must start and end with an alphanumeric character',
  }
);
const jobInvalidLength = i18n.translate(
  'xpack.ml.newJob.wizard.validateJob.jobIdInvalidMaxLengthErrorMessage',
  {
    defaultMessage:
      'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
    values: {
      maxLength: JOB_ID_MAX_LENGTH,
    },
  }
);
const jobExists = i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists', {
  defaultMessage: 'Job ID already exists. A job ID cannot be the same as an existing job or group.',
});

export const JobIdInput: FC<Props> = ({ jobType, id, index, disabled, renameJob, setIsValid }) => {
  const {
    jobs: { jobsExist: adJobsExist },
    dataFrameAnalytics: { jobsExist: dfaJobsExist },
  } = useMlApiContext();
  const [jobId, setJobId] = useState(id);
  const [validMessage, setValidMessage] = useState('');
  const jobsExist = jobType === 'anomaly-detector' ? adJobsExist : dfaJobsExist;
  const [valid, setValid] = useState(VALIDATION_STATUS.VALIDATING);

  useEffect(() => {
    setJobId(id);
  }, [id]);

  useEffect(() => {
    setIsValid(index, valid);
  }, [valid]);

  const validate = useCallback(async () => {
    if (jobId === '') {
      setValid(VALIDATION_STATUS.INVALID);
      setValidMessage(jobEmpty);
      return;
    }

    if (isJobIdValid(jobId) === false) {
      setValid(VALIDATION_STATUS.INVALID);
      setValidMessage(jobInvalid);
      return;
    }

    if (jobId.length > JOB_ID_MAX_LENGTH) {
      setValid(VALIDATION_STATUS.INVALID);
      setValidMessage(jobInvalidLength);
      return;
    }

    const resp = await jobsExist([jobId], true);
    if (resp[jobId].exists) {
      setValid(VALIDATION_STATUS.INVALID);
      setValidMessage(jobExists);
      return;
    }

    setValidMessage('');
    setValid(VALIDATION_STATUS.VALID);
    renameJob(index, jobId);
  }, [jobId]);

  useDebounce(validate, 400, [jobId]);

  const rename = useCallback(
    (e: any) => {
      setValid(VALIDATION_STATUS.VALIDATING);
      setJobId(e.target.value);
      setValidMessage('');
    },
    [setIsValid]
  );

  return (
    <EuiFormRow error={validMessage} isInvalid={validMessage.length > 0}>
      <EuiFieldText
        prepend={i18n.translate(
          'xpack.fileDataVisualizer.aboutPanel.selectOrDragAndDropFileDescription',
          {
            defaultMessage: 'Job ID',
          }
        )}
        disabled={disabled}
        compressed={true}
        value={jobId}
        onChange={(e) => rename(e)}
        isInvalid={validMessage.length > 0}
      />
    </EuiFormRow>
  );
};

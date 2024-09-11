/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { JobType } from '../../../../../common/types/saved_objects';
import { isValidIndexName } from '../../../../../common/util/es_utils';
import { isJobIdValid } from '../../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../../common/constants/validation';
import type { JobIdObject } from './jobs_import_service';
import { useMlApi } from '../../../contexts/kibana';

export const useValidateIds = (
  jobType: JobType | null,
  jobIdObjects: JobIdObject[],
  idsMash: string,
  setJobIdObjects: (j: JobIdObject[]) => void,
  setValidatingJobs: (b: boolean) => void
) => {
  const {
    jobs: { jobsExist: adJobsExist },
    dataFrameAnalytics: { jobsExist: dfaJobsExist },
    checkIndicesExists,
  } = useMlApi();

  const validateIds = useCallback(async () => {
    const jobIdExistsChecks: string[] = [];
    const destIndexExistsChecks: string[] = [];

    const skipDestIndexCheck = jobType === 'anomaly-detector';

    jobIdObjects
      .filter(({ jobIdValidated }) => jobIdValidated === false)
      .forEach((j) => {
        j.jobIdValid = true;
        j.jobIdInvalidMessage = '';

        if (j.jobId === '') {
          j.jobIdValid = false;
          j.jobIdInvalidMessage = jobEmpty;
          j.jobIdValidated = skipDestIndexCheck;
        } else if (j.jobId.length > JOB_ID_MAX_LENGTH) {
          j.jobIdValid = false;
          j.jobIdInvalidMessage = jobInvalidLength;
          j.jobIdValidated = skipDestIndexCheck;
        } else if (isJobIdValid(j.jobId) === false) {
          j.jobIdValid = false;
          j.jobIdInvalidMessage = jobInvalid;
          j.jobIdValidated = skipDestIndexCheck;
        }

        if (j.jobIdValid === true) {
          jobIdExistsChecks.push(j.jobId);
        }
      });

    if (jobType === 'data-frame-analytics') {
      jobIdObjects
        .filter(({ destIndexValidated }) => destIndexValidated === false)
        .forEach((j) => {
          if (j.destIndex === undefined) {
            return;
          }
          j.destIndexValid = true;
          j.destIndexInvalidMessage = '';

          if (j.destIndex === '') {
            j.destIndexValid = false;
            j.destIndexInvalidMessage = destIndexEmpty;
            j.destIndexValidated = true;
          } else if (isValidIndexName(j.destIndex) === false) {
            j.destIndexValid = false;
            j.destIndexInvalidMessage = destIndexInvalid;
            j.destIndexValidated = true;
          }

          if (j.destIndexValid === true) {
            destIndexExistsChecks.push(j.destIndex);
          }
        });
    }

    if (jobType !== null) {
      const jobsExist = jobType === 'anomaly-detector' ? adJobsExist : dfaJobsExist;
      const resp = await jobsExist(jobIdExistsChecks, true);
      jobIdObjects.forEach((j) => {
        const jobResp = resp[j.jobId];
        if (jobResp) {
          const { exists } = jobResp;
          j.jobIdValid = !exists;
          j.jobIdInvalidMessage = exists ? jobExists : '';
          j.jobIdValidated = true;
        }
      });

      if (jobType === 'data-frame-analytics') {
        const resp2 = await checkIndicesExists({ indices: destIndexExistsChecks });
        jobIdObjects.forEach((j) => {
          if (j.destIndex !== undefined && j.destIndexValidated === false) {
            const exists = resp2[j.destIndex]?.exists === true;
            j.destIndexInvalidMessage = exists ? destIndexExists : '';
            j.destIndexValidated = true;
          }
        });
      }

      setJobIdObjects([...jobIdObjects]);
      setValidatingJobs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsMash, jobIdObjects]);

  return [validateIds];
};

const jobEmpty = i18n.translate('xpack.ml.importExport.importFlyout.validateJobId.jobNameEmpty', {
  defaultMessage: 'Enter a valid job ID',
});
const jobInvalid = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateJobId.jobNameAllowedCharacters',
  {
    defaultMessage:
      'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
      'must start and end with an alphanumeric character',
  }
);
const jobInvalidLength = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateJobId.jobIdInvalidMaxLengthErrorMessage',
  {
    defaultMessage:
      'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
    values: {
      maxLength: JOB_ID_MAX_LENGTH,
    },
  }
);
const jobExists = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateJobId.jobNameAlreadyExists',
  {
    defaultMessage:
      'Job ID already exists. A job ID cannot be the same as an existing job or group.',
  }
);

const destIndexEmpty = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateDestIndex.destIndexEmpty',
  {
    defaultMessage: 'Enter a valid destination index',
  }
);

const destIndexInvalid = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateDestIndex.destIndexInvalid',
  {
    defaultMessage: 'Invalid destination index name.',
  }
);

const destIndexExists = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateDestIndex.destIndexExists',
  {
    defaultMessage:
      'An index with this name already exists. Be aware that running this analytics job will modify this destination index.',
  }
);

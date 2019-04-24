/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { DataFrameJobConfig } from '../../common';
import { JobId, TargetIndex } from './common';

export interface JobDetailsExposedState {
  jobId: JobId;
  targetIndex: TargetIndex;
  touched: boolean;
  valid: boolean;
}

export function getDefaultJobDetailsState(): JobDetailsExposedState {
  return {
    jobId: '',
    targetIndex: '',
    touched: false,
    valid: false,
  };
}

interface Props {
  overrides?: JobDetailsExposedState;
  onChange(s: JobDetailsExposedState): void;
}

export const JobDetailsForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const defaults = { ...getDefaultJobDetailsState(), ...overrides };

  const [jobId, setJobId] = useState(defaults.jobId);
  const [targetIndex, setTargetIndex] = useState(defaults.targetIndex);
  const [jobIds, setJobIds] = useState([]);
  const [indexNames, setIndexNames] = useState([] as string[]);

  // fetch existing job IDs and indices once for form validation
  useEffect(() => {
    // use an IIFE to avoid returning a Promise to useEffect.
    (async function() {
      try {
        setJobIds(
          (await ml.dataFrame.getDataFrameTransforms()).transforms.map(
            (job: DataFrameJobConfig) => job.id
          )
        );
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.jobDetailsForm.errorGettingDataFrameJobsList', {
            defaultMessage: 'An error occurred getting the existing data frame job Ids: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }

      try {
        setIndexNames((await ml.getIndices()).map(index => index.name));
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.jobDetailsForm.errorGettingDataFrameIndexNames', {
            defaultMessage: 'An error occurred getting the existing index names: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }
    })();
  }, []);

  const jobIdExists = jobIds.some(id => jobId === id);
  const indexNameExists = indexNames.some(name => targetIndex === name);
  const valid = jobId !== '' && targetIndex !== '' && !jobIdExists && !indexNameExists;

  // expose state to wizard
  useEffect(
    () => {
      onChange({ jobId, targetIndex, touched: true, valid });
    },
    [jobId, targetIndex, valid]
  );

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdLabel', {
          defaultMessage: 'Job id',
        })}
        isInvalid={jobIdExists}
        error={
          jobIdExists && [
            i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdError', {
              defaultMessage: 'A job with this id already exists.',
            }),
          ]
        }
      >
        <EuiFieldText
          placeholder="job id"
          value={jobId}
          onChange={e => setJobId(e.target.value)}
          aria-label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdInputAriaLabel', {
            defaultMessage: 'Choose a unique job id.',
          })}
          isInvalid={jobIdExists}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.targetIndexLabel', {
          defaultMessage: 'Target index',
        })}
        isInvalid={indexNameExists}
        error={
          indexNameExists && [
            i18n.translate('xpack.ml.dataframe.jobDetailsForm.targetIndexError', {
              defaultMessage: 'An index with this name already exists.',
            }),
          ]
        }
      >
        <EuiFieldText
          placeholder="target index"
          value={targetIndex}
          onChange={e => setTargetIndex(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.jobDetailsForm.targetIndexInputAriaLabel',
            {
              defaultMessage: 'Choose a unique target index name.',
            }
          )}
          isInvalid={indexNameExists}
        />
      </EuiFormRow>
    </EuiForm>
  );
});

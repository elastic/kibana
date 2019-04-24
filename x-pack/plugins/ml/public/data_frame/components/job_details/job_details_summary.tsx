/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFormRow } from '@elastic/eui';

import { JobId, TargetIndex } from './common';

interface Props {
  jobId: JobId;
  targetIndex: TargetIndex;
  touched: boolean;
}

export const JobDetailsSummary: SFC<Props> = React.memo(({ jobId, targetIndex, touched }) => {
  if (touched === false) {
    return null;
  }

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsSummary.jobIdLabel', {
          defaultMessage: 'Job id',
        })}
      >
        <span>{jobId}</span>
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsSummary.targetIndexLabel', {
          defaultMessage: 'Target index',
        })}
      >
        <span>{targetIndex}</span>
      </EuiFormRow>
    </Fragment>
  );
});

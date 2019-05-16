/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { JobDetailsExposedState } from './job_details_form';

export const JobDetailsSummary: SFC<JobDetailsExposedState> = React.memo(
  ({ createIndexPattern, jobId, targetIndex, touched }) => {
    if (touched === false) {
      return null;
    }

    const targetIndexHelpText = createIndexPattern
      ? i18n.translate('xpack.ml.dataframe.jobDetailsSummary.createIndexPatternMessage', {
          defaultMessage: 'A Kibana index pattern will be created for this job.',
        })
      : '';

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.jobDetailsSummary.jobIdLabel', {
            defaultMessage: 'Job id',
          })}
        >
          <EuiFieldText defaultValue={jobId} disabled={true} />
        </EuiFormRow>
        <EuiFormRow
          helpText={targetIndexHelpText}
          label={i18n.translate('xpack.ml.dataframe.jobDetailsSummary.targetIndexLabel', {
            defaultMessage: 'Target index',
          })}
        >
          <EuiFieldText defaultValue={targetIndex} disabled={true} />
        </EuiFormRow>
      </Fragment>
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiCallOut, EuiPanel, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ExplorationTitle } from '../exploration_title';

const jobConfigErrorTitle = i18n.translate('xpack.ml.dataframe.analytics.jobConfig.errorTitle', {
  defaultMessage: 'Unable to fetch results. An error occurred loading the job configuration data.',
});

const jobCapsErrorTitle = i18n.translate('xpack.ml.dataframe.analytics.jobCaps.errorTitle', {
  defaultMessage: "Unable to fetch results. An error occurred loading the index's field data.",
});

interface Props {
  jobCapsServiceErrorMessage: string | undefined;
  jobConfigErrorMessage: string | undefined;
  title: string;
}

export const JobConfigErrorCallout: FC<Props> = ({
  jobCapsServiceErrorMessage,
  jobConfigErrorMessage,
  title,
}) => {
  return (
    <EuiPanel grow={false}>
      <ExplorationTitle title={title} />
      <EuiSpacer />
      <EuiCallOut
        title={jobConfigErrorMessage ? jobConfigErrorTitle : jobCapsErrorTitle}
        color="danger"
        iconType="cross"
      >
        <p>{jobConfigErrorMessage ? jobConfigErrorMessage : jobCapsServiceErrorMessage}</p>
      </EuiCallOut>
    </EuiPanel>
  );
};

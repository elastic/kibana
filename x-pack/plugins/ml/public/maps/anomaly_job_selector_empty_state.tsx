/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  jobsManagementPath: string;
  canCreateJobs: boolean;
}

export const AnomalyJobSelectorEmptyState: FC<Props> = ({ jobsManagementPath, canCreateJobs }) => (
  <EuiEmptyPrompt
    layout="vertical"
    hasBorder={false}
    hasShadow={false}
    color="subdued"
    title={
      <h2>
        <FormattedMessage
          id="xpack.ml.mapsAnomaliesLayerEmptyPrompt.createJobMessage"
          defaultMessage="Create an anomaly detection job"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.ml.mapsAnomaliesLayerEmptyPrompt.emptyPromptText"
          defaultMessage="Anomaly detection enables you to find unusual behaviour in your geographic data. Create a job that uses the lat_long function, which is necessary for the maps anomaly layer."
        />
      </p>
    }
    actions={
      <EuiButton
        color="primary"
        href={jobsManagementPath}
        fill
        iconType="plusInCircle"
        isDisabled={!canCreateJobs}
        data-test-subj="mlMapsCreateNewJobButton"
      >
        <FormattedMessage
          id="xpack.ml.mapsAnomaliesLayerEmptyPrompt.createJobButtonText"
          defaultMessage="Create job"
        />
      </EuiButton>
    }
    data-test-subj="mlMapsAnomalyDetectionEmptyState"
  />
);

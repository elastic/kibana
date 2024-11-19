/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { lazyMlNodesAvailable } from '../../ml_nodes_check';
import { useEnabledFeatures } from '../../contexts/ml';

interface Props {
  jobCount: number;
}

export const JobsAwaitingNodeWarning: FC<Props> = ({ jobCount }) => {
  const { showNodeInfo } = useEnabledFeatures();
  if (showNodeInfo === false || lazyMlNodesAvailable() === false || jobCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarning.title"
            defaultMessage="Awaiting machine learning node"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <div>
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarning.noMLNodesAvailableDescription"
            defaultMessage="{jobCount, plural, one {# job} other {# jobs}} will start after autoscaling has increased ML capacity. This may take several minutes."
            values={{
              jobCount,
            }}
          />
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

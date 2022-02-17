/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { lazyMlNodesAvailable } from '../../ml_nodes_check';

interface Props {
  jobCount: number;
}

export const JobsAwaitingNodeWarning: FC<Props> = ({ jobCount }) => {
  if (lazyMlNodesAvailable() === false || jobCount === 0) {
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
            defaultMessage="There {jobCount, plural, one {is} other {are}} {jobCount, plural, one {# job} other {# jobs}} waiting for machine learning nodes to start."
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

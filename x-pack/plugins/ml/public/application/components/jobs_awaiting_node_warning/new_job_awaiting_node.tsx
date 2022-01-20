/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobType } from '../../../../common/types/saved_objects';
import { lazyMlNodesAvailable } from '../../ml_nodes_check';

interface Props {
  jobType: JobType;
}

export const NewJobAwaitingNodeWarning: FC<Props> = () => {
  if (lazyMlNodesAvailable() === false) {
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
            id="xpack.ml.newJobAwaitingNodeWarning.noMLNodesAvailableDescription"
            defaultMessage="There are currently no nodes that can run the job, therefore it will remain in OPENING state until an appropriate node becomes available."
          />
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

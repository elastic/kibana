/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobType } from '../../../../common/types/saved_objects';

interface Props {
  jobType: JobType;
}

export const NewJobAwaitingNodeWarning: FC<Props> = () => {
  return (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarning.title"
            defaultMessage="Awaiting ML node provisioning"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <div>
          <FormattedMessage
            id="xpack.ml.newJobAwaitingNodeWarning.noMLNodesAvailableDescription"
            defaultMessage="Job cannot be started straight away, an ML node needs to be started. This will happen automatically."
          />
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
};

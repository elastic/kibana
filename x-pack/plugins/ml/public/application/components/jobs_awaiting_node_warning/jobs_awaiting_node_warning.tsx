/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { isCloud } from '../../services/ml_server_info';

interface Props {
  jobCount: number;
}

export const JobsAwaitingNodeWarning: FC<Props> = ({ jobCount }) => {
  if (isCloud() === false || jobCount === 0) {
    return null;
  }

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
            id="xpack.ml.jobsAwaitingNodeWarning.noMLNodesAvailableDescription"
            defaultMessage="There {jobCount, plural, one {is} other {are}} {jobCount, plural, one {# job} other {# jobs}} waiting to be started while ML nodes are being provisioned."
            values={{
              jobCount,
            }}
          />
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
};

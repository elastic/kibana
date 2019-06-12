/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { RepositoryVerification } from '../../../common/types';
import { useAppDependencies } from '../index';

interface Props {
  verificationResults: RepositoryVerification | null;
}

export const RepositoryVerificationBadge: React.FunctionComponent<Props> = ({
  verificationResults,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  if (!verificationResults) {
    return (
      <EuiHealth color="subdued">
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryVerification.verificationUnknownValue"
          defaultMessage="Unknown"
        />
      </EuiHealth>
    );
  }

  if (verificationResults.valid) {
    return (
      <EuiHealth color="success">
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryVerification.verificationSuccessfulValue"
          defaultMessage="Connected"
        />
      </EuiHealth>
    );
  }

  return (
    <EuiHealth color="warning">
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryVerification.verificationErrorValue"
        defaultMessage="Not connected"
      />
    </EuiHealth>
  );
};

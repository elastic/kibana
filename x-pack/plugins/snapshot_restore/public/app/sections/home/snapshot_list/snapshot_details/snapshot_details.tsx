/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
// import { useAppDependencies } from '../../../../index';
import { loadSnapshot } from '../../../../services/http';

interface Props extends RouteComponentProps {
  repositoryName: string;
  snapshotId: string;
  onClose: () => void;
}

const SnapshotDetailsUi: React.FunctionComponent<Props> = ({
  repositoryName,
  snapshotId,
  onClose,
}) => {
  // const {
  //   core: { i18n },
  // } = useAppDependencies();

  const {
    // error,
    // loading,
    data: snapshotDetails,
  } = loadSnapshot(repositoryName, snapshotId);

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="srSnapshotDetailsFlyout"
      aria-labelledby="srSnapshotDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="srSnapshotDetailsFlyoutTitle" data-test-subj="srSnapshotDetailsFlyoutTitle">
            {repositoryName} > {snapshotId}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="srSnapshotDetailsContent">
        {snapshotDetails && snapshotDetails.uid}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const SnapshotDetails = withRouter(SnapshotDetailsUi);

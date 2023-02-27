/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';

import { linkToRepositories } from '../../../../services/navigation';
import { reactRouterNavigate } from '../../../../../shared_imports';

export const SnapshotFailedToLoad: React.FunctionComponent = () => {
  const history = useHistory();

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryWarningTitle"
            defaultMessage="Some repositories contain errors"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="snapshotFailedToLoad"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryWarningDescription"
          defaultMessage="Snapshots might load slowly. Go to {repositoryLink} to fix the errors."
          values={{
            repositoryLink: (
              <EuiLink {...reactRouterNavigate(history, linkToRepositories())}>
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryWarningLinkText"
                  defaultMessage="Repositories"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};

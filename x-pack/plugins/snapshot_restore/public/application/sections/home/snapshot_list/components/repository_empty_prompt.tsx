/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { reactRouterNavigate } from '../../../../../shared_imports';
import { linkToAddRepository } from '../../../../services/navigation';

export const RepositoryEmptyPrompt: React.FunctionComponent = () => {
  const history = useHistory();
  return (
    <EuiPageContent
      hasShadow={false}
      paddingSize="none"
      verticalPosition="center"
      horizontalPosition="center"
      data-test-subj="snapshotListEmpty"
    >
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesTitle"
              defaultMessage="Start by registering a repository"
            />
          </h1>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesDescription"
                defaultMessage="You need a place where your snapshots will live."
              />
            </p>
            <p>
              <EuiButton
                {...reactRouterNavigate(history, linkToAddRepository())}
                fill
                iconType="plusInCircle"
                data-test-subj="registerRepositoryButton"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesAddButtonLabel"
                  defaultMessage="Register a repository"
                />
              </EuiButton>
            </p>
          </>
        }
        data-test-subj="emptyPrompt"
      />
    </EuiPageContent>
  );
};

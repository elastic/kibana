/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { useFetch } from '../../../../services/api';
import { AppStateInterface, useStateValue } from '../../../../services/app_context';

import { Repository, SourceRepositoryType } from '../../../../../../common/repository_types';
import { RepositoryTypeName, SectionError, SectionLoading } from '../../../../components';

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

interface Props {
  repositoryName: Repository['name'];
  onClose: () => void;
}

export const RepositoryDetails = ({ repositoryName, onClose }: Props) => {
  const [
    {
      core: { i18n },
    },
  ] = useStateValue() as [AppStateInterface];
  const { FormattedMessage } = i18n;
  const { error, loading, data: repository } = useFetch({
    path: `repositories/${repositoryName}`,
    method: 'get',
  });

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.loadingRepository"
          defaultMessage="Loading repository..."
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = error.status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.repositoryDetails.errorRepositoryNotFound',
              {
                defaultMessage: `The repository '{name}' does not exist.`,
                values: {
                  name: repositoryName,
                },
              }
            ),
          },
        }
      : error;
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.errorLoadingRepositoryTitle"
            defaultMessage="Error loading repository"
          />
        }
        error={errorObject}
      />
    );
  };

  const renderRepository = () => {
    const { type } = repository as Repository;
    if (type === SourceRepositoryType) {
      return <RepositoryTypeName type={type} delegateType={repository.settings.delegate_type} />;
    } else {
      return <RepositoryTypeName type={type} />;
    }
  };

  let content;

  if (loading) {
    content = renderLoading();
  } else if (error) {
    content = renderError();
  } else {
    content = renderRepository();
  }

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="srRepositoryDetailsFlyout"
      aria-labelledby="srRepositoryDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="srRepositoryDetailsFlyoutTitle" data-test-subj="srRepositoryDetailsFlyoutTitle">
            {repositoryName}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="srRepositoryDetailsContent">{content}</EuiFlyoutBody>
    </EuiFlyout>
  );
};

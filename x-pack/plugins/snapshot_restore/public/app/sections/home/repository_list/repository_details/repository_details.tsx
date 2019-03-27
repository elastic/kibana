/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { useAppDependencies } from '../../../../index';
import { getRepositoryTypeDocUrl } from '../../../../services/documentation';
import { useRequest } from '../../../../services/http';

import { API_BASE_PATH, REPOSITORY_TYPES } from '../../../../../../common/constants';
import { Repository } from '../../../../../../common/types';
import {
  RepositoryDeleteProvider,
  RepositoryTypeName,
  RepositoryVerificationBadge,
  SectionError,
  SectionLoading,
} from '../../../../components';
import { BASE_PATH, Section } from '../../../../constants';
import { TypeDetails } from './type_details';

import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import 'brace/theme/textmate';

interface Props extends RouteComponentProps {
  repositoryName: Repository['name'];
  onClose: () => void;
}

const RepositoryDetailsUi: React.FunctionComponent<Props> = ({
  repositoryName,
  onClose,
  history,
}) => {
  const {
    core: {
      chrome,
      http,
      i18n,
      documentation: { esDocBasePath, esPluginDocBasePath },
    },
  } = useAppDependencies();

  const { FormattedMessage } = i18n;
  const section = 'repositories' as Section;
  const {
    error,
    loading,
    data: { repository, verification },
  } = useRequest({
    path: chrome.addBasePath(`${API_BASE_PATH}repositories/${repositoryName}`),
    method: 'get',
    httpClient: http.getClient(),
  });

  const renderBody = () => {
    if (loading) {
      return renderLoading();
    }
    if (error) {
      return renderError();
    }
    return renderRepository();
  };

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
    if (!repository) {
      return null;
    }
    const { type } = repository as Repository;
    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryDetails.typeTitle"
                  defaultMessage="Repository type"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {type === REPOSITORY_TYPES.source ? (
              <RepositoryTypeName type={type} delegateType={repository.settings.delegate_type} />
            ) : (
              <RepositoryTypeName type={type} />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={getRepositoryTypeDocUrl(type, esDocBasePath, esPluginDocBasePath)}
              target="_blank"
              iconType="help"
            >
              Type docs
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <TypeDetails repository={repository} />
        <EuiHorizontalRule />
        {renderVerification()}
      </Fragment>
    );
  };

  const renderVerification = () => (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.verificationTitle"
            defaultMessage="Verification status"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <RepositoryVerificationBadge verificationResults={verification || null} />
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.verificationDetailsTitle"
            defaultMessage="Details"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {verification ? (
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          isReadOnly
          value={JSON.stringify(verification.response || verification.error, null, 2)}
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
            maxLines: Infinity,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={false}
          minLines={6}
          aria-label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryDetails.verificationDetails"
              defaultMessage="Verification details repository '{name}'"
              values={{
                name,
              }}
            />
          }
        />
      ) : null}
    </Fragment>
  );

  const renderFooter = () => {
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onClose}
            data-test-subj="srRepositoryDetailsFlyoutCloseButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryDetails.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        {!error && !loading && repository ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <RepositoryDeleteProvider>
                  {(deleteRepository: (names: Array<Repository['name']>) => void) => {
                    return (
                      <EuiButtonEmpty
                        color="danger"
                        data-test-subj="srRepositoryDetailsDeleteActionButton"
                        onClick={() => deleteRepository([repositoryName])}
                      >
                        <FormattedMessage
                          id="xpack.snapshotRestore.repositoryDetails.removeButtonLabel"
                          defaultMessage="Remove"
                        />
                      </EuiButtonEmpty>
                    );
                  }}
                </RepositoryDeleteProvider>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => {
                    history.push(`${BASE_PATH}/${section}/edit/${repositoryName}`);
                  }}
                  fill
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryDetails.editButtonLabel"
                    defaultMessage="Edit"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };

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

      <EuiFlyoutBody data-test-subj="srRepositoryDetailsContent">{renderBody()}</EuiFlyoutBody>

      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const RepositoryDetails = withRouter(RepositoryDetailsUi);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import 'brace/theme/textmate';

import { useAppDependencies } from '../../../../index';
import { documentationLinksService } from '../../../../services/documentation';
import {
  loadRepository,
  verifyRepository as verifyRepositoryRequest,
} from '../../../../services/http';
import { textService } from '../../../../services/text';
import { linkToSnapshots } from '../../../../services/navigation';

import { REPOSITORY_TYPES } from '../../../../../../common/constants';
import { Repository, RepositoryVerification } from '../../../../../../common/types';
import {
  RepositoryDeleteProvider,
  SectionError,
  SectionLoading,
  RepositoryVerificationBadge,
} from '../../../../components';
import { BASE_PATH } from '../../../../constants';
import { TypeDetails } from './type_details';

interface Props extends RouteComponentProps {
  repositoryName: Repository['name'];
  onClose: () => void;
  onRepositoryDeleted: (repositoriesDeleted: Array<Repository['name']>) => void;
}

const RepositoryDetailsUi: React.FunctionComponent<Props> = ({
  repositoryName,
  onClose,
  onRepositoryDeleted,
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const { FormattedMessage } = i18n;
  const { error, data: repositoryDetails } = loadRepository(repositoryName);
  const [verification, setVerification] = useState<RepositoryVerification | undefined>(undefined);
  const [isLoadingVerification, setIsLoadingVerification] = useState<boolean>(false);

  const verifyRepository = async () => {
    setIsLoadingVerification(true);
    const { data } = await verifyRepositoryRequest(repositoryName);
    setVerification(data.verification);
    setIsLoadingVerification(false);
  };

  // Reset verification state when repository name changes, either from adjust URL or clicking
  // into a different repository in table list.
  useEffect(
    () => {
      setVerification(undefined);
      setIsLoadingVerification(false);
    },
    [repositoryName]
  );

  const renderBody = () => {
    if (repositoryDetails) {
      return renderRepository();
    }
    if (error) {
      return renderError();
    }
    return renderLoading();
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.loadingRepositoryDescription"
          defaultMessage="Loading repository…"
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
              'xpack.snapshotRestore.repositoryDetails.repositoryNotFoundErrorMessage',
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
            id="xpack.snapshotRestore.repositoryDetails.loadingRepositoryErrorTitle"
            defaultMessage="Error loading repository"
          />
        }
        error={errorObject}
      />
    );
  };

  const renderSnapshotCount = () => {
    const { snapshots } = repositoryDetails;
    if (!Number.isInteger(snapshots.count)) {
      return (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.noSnapshotInformationDescription"
          defaultMessage="No snapshot information"
        />
      );
    }
    if (snapshots.count === 0) {
      return (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.zeroSnapshotsDescription"
          defaultMessage="Repository has no snapshots"
        />
      );
    }
    return (
      <EuiLink href={linkToSnapshots(repositoryName)}>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.snapshotsDescription"
          defaultMessage="{count} {count, plural, one {snapshot} other {snapshots}} found"
          values={{ count: snapshots.count }}
        />
      </EuiLink>
    );
  };

  const renderRepository = () => {
    const { repository, isManagedRepository } = repositoryDetails;

    if (!repository) {
      return null;
    }

    const { type } = repository as Repository;
    return (
      <Fragment>
        {isManagedRepository ? (
          <Fragment>
            <EuiCallOut
              size="s"
              color="warning"
              iconType="iInCircle"
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryDetails.managedRepositoryWarningTitle"
                  defaultMessage="This is a managed repository used by other systems. Any changes you make might affect how these systems operate."
                />
              }
            />
            <EuiSpacer size="l" />
          </Fragment>
        ) : null}
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
            <span data-test-subj="repositoryType">
              {type === REPOSITORY_TYPES.source
                ? textService.getRepositoryTypeName(type, repository.settings.delegateType)
                : textService.getRepositoryTypeName(type)}
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={documentationLinksService.getRepositoryTypeDocUrl(type)}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryDetails.repositoryTypeDocLink"
                defaultMessage="Repository docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryDetails.snapshotsTitle"
              defaultMessage="Snapshots"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <span data-test-subj="snapshotCount">{renderSnapshotCount()}</span>
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
      {verification ? (
        <Fragment>
          <EuiSpacer size="s" />
          <RepositoryVerificationBadge verificationResults={verification} />
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
              value={JSON.stringify(
                verification.valid ? verification.response : verification.error,
                null,
                2
              )}
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
          <EuiSpacer size="m" />
          <EuiButton onClick={verifyRepository} color="primary" isLoading={isLoadingVerification}>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryDetails.reverifyButtonLabel"
              defaultMessage="Re-verify repository"
            />
          </EuiButton>
        </Fragment>
      ) : (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiButton
            onClick={verifyRepository}
            color="primary"
            isLoading={isLoadingVerification}
            data-test-subj="verifyRepositoryButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryDetails.verifyButtonLabel"
              defaultMessage="Verify repository"
            />
          </EuiButton>
        </Fragment>
      )}
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

        {repositoryDetails ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <RepositoryDeleteProvider>
                  {deleteRepositoryPrompt => {
                    return (
                      <EuiButtonEmpty
                        color="danger"
                        data-test-subj="srRepositoryDetailsDeleteActionButton"
                        onClick={() =>
                          deleteRepositoryPrompt([repositoryName], onRepositoryDeleted)
                        }
                        isDisabled={repositoryDetails.isManagedRepository}
                        title={
                          repositoryDetails.isManagedRepository
                            ? i18n.translate(
                                'xpack.snapshotRestore.repositoryDetails.removeManagedRepositoryButtonTitle',
                                {
                                  defaultMessage: 'You cannot delete a managed repository.',
                                }
                              )
                            : null
                        }
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
                  href={history.createHref({
                    pathname: `${BASE_PATH}/edit_repository/${repositoryName}`,
                  })}
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
      data-test-subj="repositoryDetail"
      aria-labelledby="srRepositoryDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="srRepositoryDetailsFlyoutTitle" data-test-subj="title">
            {repositoryName}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{renderBody()}</EuiFlyoutBody>

      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const RepositoryDetails = withRouter(RepositoryDetailsUi);

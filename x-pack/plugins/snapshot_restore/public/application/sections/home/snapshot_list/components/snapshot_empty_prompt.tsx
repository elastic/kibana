/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, EuiIcon, EuiLink, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { APP_SLM_CLUSTER_PRIVILEGES } from '../../../../../../common';
import { reactRouterNavigate, WithPrivileges } from '../../../../../shared_imports';
import { linkToAddPolicy, linkToPolicies } from '../../../../services/navigation';
import { useCore } from '../../../../app_context';

export const SnapshotEmptyPrompt: React.FunctionComponent<{ policiesCount: number }> = ({
  policiesCount,
}) => {
  const { docLinks } = useCore();
  const history = useHistory();
  return (
    <EuiPageContent
      hasShadow={false}
      paddingSize="none"
      verticalPosition="center"
      horizontalPosition="center"
    >
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.noSnapshotsTitle"
              defaultMessage="You don't have any snapshots yet"
            />
          </h1>
        }
        body={
          <WithPrivileges privileges={APP_SLM_CLUSTER_PRIVILEGES.map((name) => `cluster.${name}`)}>
            {({ hasPrivileges }) =>
              hasPrivileges ? (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.snapshotRestore.snapshotList.emptyPrompt.usePolicyDescription"
                      defaultMessage="Run a Snapshot Lifecycle Policy to create a snapshot.
                          You can also create a snapshot using {docLink}."
                      values={{
                        docLink: (
                          <EuiLink
                            href={docLinks.links.snapshotRestore.createSnapshot}
                            target="_blank"
                            data-test-subj="documentationLink"
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.emptyPrompt.usePolicyDocLinkText"
                              defaultMessage="the Elasticsearch API"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                  <p>
                    {policiesCount === 0 ? (
                      <EuiButton
                        {...reactRouterNavigate(history, linkToAddPolicy())}
                        fill
                        iconType="plusInCircle"
                        data-test-subj="addPolicyButton"
                      >
                        <FormattedMessage
                          id="xpack.snapshotRestore.snapshotList.emptyPrompt.addPolicyText"
                          defaultMessage="Create a policy"
                        />
                      </EuiButton>
                    ) : (
                      <EuiButton
                        {...reactRouterNavigate(history, linkToPolicies())}
                        fill
                        iconType="list"
                        data-test-subj="goToPoliciesButton"
                      >
                        <FormattedMessage
                          id="xpack.snapshotRestore.snapshotList.emptyPrompt.goToPoliciesText"
                          defaultMessage="View policies"
                        />
                      </EuiButton>
                    )}
                  </p>
                </Fragment>
              ) : (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.snapshotRestore.snapshotList.emptyPrompt.noSnapshotsDescription"
                      defaultMessage="Create a snapshot using the Elasticsearch API."
                    />
                  </p>
                  <p>
                    <EuiLink
                      href={docLinks.links.snapshotRestore.createSnapshot}
                      target="_blank"
                      data-test-subj="documentationLink"
                    >
                      <FormattedMessage
                        id="xpack.snapshotRestore.emptyPrompt.noSnapshotsDocLinkText"
                        defaultMessage="Learn how to create a snapshot"
                      />{' '}
                      <EuiIcon type="link" />
                    </EuiLink>
                  </p>
                </Fragment>
              )
            }
          </WithPrivileges>
        }
        data-test-subj="emptyPrompt"
      />
    </EuiPageContent>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ReactElement, ReactNode, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { ApplicationStart } from 'kibana/public';
import { RouteComponentProps } from 'react-router-dom';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { PolicyFromES } from '../../../../common/types';
import { filterItems } from '../../services';
import { TableContent } from './components/table_content';
import { getPolicyCreatePath } from '../../services/navigation';

interface Props {
  policies: PolicyFromES[];
  history: RouteComponentProps['history'];
  navigateToApp: ApplicationStart['navigateToApp'];
  updatePolicies: () => void;
}

export const PolicyTable: React.FunctionComponent<Props> = ({
  policies,
  history,
  navigateToApp,
  updatePolicies,
}) => {
  const [confirmModal, setConfirmModal] = useState<ReactNode | null>();
  const [filter, setFilter] = useState<string>('');

  const createPolicyButton = (
    <EuiButton
      {...reactRouterNavigate(history, getPolicyCreatePath())}
      fill
      iconType="plusInCircle"
      data-test-subj="createPolicyButton"
    >
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.policyTable.emptyPrompt.createButtonLabel"
        defaultMessage="Create policy"
      />
    </EuiButton>
  );

  let content: ReactElement;

  if (policies.length > 0) {
    const filteredPolicies = filterItems('name', filter, policies);
    let tableContent: ReactElement;
    if (filteredPolicies.length > 0) {
      tableContent = (
        <TableContent
          policies={filteredPolicies}
          totalNumber={policies.length}
          navigateToApp={navigateToApp}
          setConfirmModal={setConfirmModal}
          handleDelete={() => {
            updatePolicies();
            setConfirmModal(null);
          }}
          history={history}
        />
      );
    } else {
      tableContent = (
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.noMatch.noPolicicesDescription"
          defaultMessage="No policies to show"
        />
      );
    }

    content = (
      <Fragment>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
              }}
              data-test-subj="policyTableFilterInput"
              placeholder={i18n.translate(
                'xpack.indexLifecycleMgmt.policyTable.systempoliciesSearchInputPlaceholder',
                {
                  defaultMessage: 'Search',
                }
              )}
              aria-label={i18n.translate(
                'xpack.indexLifecycleMgmt.policyTable.systempoliciesSearchInputAriaLabel',
                {
                  defaultMessage: 'Search policies',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {tableContent}
      </Fragment>
    );
  } else {
    return (
      <EuiPageBody>
        <EuiPageContent verticalPosition="center" horizontalPosition="center">
          <EuiEmptyPrompt
            iconType="managementApp"
            title={
              <h1>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyTable.emptyPromptTitle"
                  defaultMessage="Create your first index lifecycle policy"
                />
              </h1>
            }
            body={
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.policyTable.emptyPromptDescription"
                    defaultMessage=" An index lifecycle policy helps you manage your indices as they age."
                  />
                </p>
              </Fragment>
            }
            actions={createPolicyButton}
          />
        </EuiPageContent>
      </EuiPageBody>
    );
  }

  return (
    <EuiPageBody>
      <EuiPageContent verticalPosition="center" horizontalPosition="center">
        {confirmModal}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1 data-test-subj="sectionHeading">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyTable.sectionHeading"
                  defaultMessage="Index Lifecycle Policies"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{createPolicyButton}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
              defaultMessage="Manage your indices as they age.  Attach a policy to automate
                        when and how to transition an index through its lifecycle."
            />
          </p>
        </EuiText>

        <EuiSpacer />
        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButton, EuiEmptyPrompt, EuiSpacer, EuiPageHeader, EuiPageContent } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { PolicyFromES } from '../../../../common/types';
import { PolicyTable } from './components/policy_table';
import { getPolicyCreatePath } from '../../services/navigation';
import { ListActionHandler } from './components/list_action_handler';

interface Props {
  policies: PolicyFromES[];
  updatePolicies: () => void;
}

export const PolicyList: React.FunctionComponent<Props> = ({ policies, updatePolicies }) => {
  const history = useHistory();

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

  if (policies.length === 0) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
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
    );
  }

  return (
    <>
      <ListActionHandler updatePolicies={updatePolicies} />

      <EuiPageHeader
        pageTitle={
          <span data-test-subj="ilmPageHeader">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.sectionHeading"
              defaultMessage="Index Lifecycle Policies"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
            defaultMessage="Manage your indices as they age.  Attach a policy to automate
                        when and how to transition an index through its lifecycle."
          />
        }
        bottomBorder
        rightSideItems={[createPolicyButton]}
      />

      <EuiSpacer size="l" />

      <PolicyTable policies={policies} />
    </>
  );
};

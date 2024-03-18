/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { documentationService } from '../../services/documentation';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../services/breadcrumbs';

import { CreatePolicyWizard } from './create_policy_wizard';
import { CreatePolicyContextProvider } from './create_policy_context';
import {
  EnrichPoliciesAuthProvider,
  EnrichPoliciesWithPrivileges,
} from '../../components/enrich_policies';

const CreateView: React.FunctionComponent<RouteComponentProps> = () => {
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.enrichPoliciesCreate);
  }, []);

  return (
    <CreatePolicyContextProvider>
      <EuiPageHeader
        data-test-subj="createEnrichPolicyHeaderContent"
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.appTitle"
              defaultMessage="Create enrich policy"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.enrichPolicyCreate.appDescription"
            defaultMessage="Specify how to retrieve and enrich your incoming data."
          />
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty
            href={documentationService.getCreateEnrichPolicyLink()}
            target="_blank"
            iconType="help"
            data-test-subj="createEnrichPolicyDocumentationLink"
          >
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.titleDocsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <CreatePolicyWizard />
    </CreatePolicyContextProvider>
  );
};

export const EnrichPolicyCreate: React.FunctionComponent<RouteComponentProps> = (props) => (
  <EnrichPoliciesAuthProvider>
    <EnrichPoliciesWithPrivileges>
      <CreateView {...props} />
    </EnrichPoliciesWithPrivileges>
  </EnrichPoliciesAuthProvider>
);

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
import { breadcrumbService } from '../../services/breadcrumbs';

import { CreatePolicyWizard } from './create_policy_wizard';
import { CreatePolicyContextProvider } from './create_policy_context';

export const EnrichPolicyCreate: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('enrichPolicyCreate');
  }, []);

  return (
    <CreatePolicyContextProvider context={{ draftPolicy: {} }}>
      <EuiPageHeader
        data-test-subj="indexManagementHeaderContent"
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.idxMgmt.home.appTitle"
              defaultMessage="Create enrich policy"
            />
          </span>
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty
            href={documentationService.getEnrichApisLink()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.idxMgmt.home.idxMgmtDocsLinkText"
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

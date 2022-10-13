/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FormEvent } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiFieldText,
  EuiFormRow,
  EuiFilePicker,
  EuiButton,
} from '@elastic/eui';

import { LicensingLogic } from '../../../../../shared/licensing';
import { AppLogic } from '../../../../app_logic';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV, SOURCE_NAMES } from '../../../../constants';
import { handlePrivateKeyUpload } from '../../../../utils';

import { staticSourceData } from '../../source_data';

import { AddSourceHeader } from './add_source_header';
import { DocumentPermissionsCallout } from './document_permissions_callout';
import { DocumentPermissionsField } from './document_permissions_field';
import { GithubViaAppLogic } from './github_via_app_logic';
import { SourceFeatures } from './source_features';

interface GithubViaAppProps {
  isGithubEnterpriseServer: boolean;
}

export const GitHubViaApp: React.FC<GithubViaAppProps> = ({ isGithubEnterpriseServer }) => {
  const { isOrganization } = useValues(AppLogic);
  const {
    githubAppId,
    githubEnterpriseServerUrl,
    stagedPrivateKey,
    isSubmitButtonLoading,
    indexPermissionsValue,
  } = useValues(GithubViaAppLogic);
  const {
    setGithubAppId,
    setGithubEnterpriseServerUrl,
    setStagedPrivateKey,
    createContentSource,
    setSourceIndexPermissionsValue,
  } = useActions(GithubViaAppLogic);

  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const name = isGithubEnterpriseServer ? SOURCE_NAMES.GITHUB_ENTERPRISE : SOURCE_NAMES.GITHUB;
  const serviceType = isGithubEnterpriseServer ? 'github_enterprise_server' : 'github';
  const data = staticSourceData.find((source) => source.serviceType === serviceType);
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createContentSource(isGithubEnterpriseServer);
  };

  // Default indexPermissions to true, if needed
  useEffect(() => {
    setSourceIndexPermissionsValue(isOrganization && hasPlatinumLicense);
  }, []);

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']} isLoading={false}>
      <form onSubmit={handleSubmit}>
        <EuiPanel paddingSize="none" hasShadow={false} color="subdued">
          <EuiPanel hasShadow={false} paddingSize="l" color="subdued">
            <AddSourceHeader
              name={name}
              serviceType="github"
              categories={['Software', 'Version Control', 'Code Repository']} // TODO: get from API
            />
          </EuiPanel>
          <EuiHorizontalRule margin="xs" />
          <EuiPanel hasShadow={false} paddingSize="l" color="subdued">
            <SourceFeatures features={data!.features} name={name} objTypes={data!.objTypes} />
          </EuiPanel>
        </EuiPanel>

        <EuiSpacer />

        {!hasPlatinumLicense && <DocumentPermissionsCallout />}
        {hasPlatinumLicense && isOrganization && (
          <DocumentPermissionsField
            needsPermissions
            indexPermissionsValue={indexPermissionsValue}
            setValue={setSourceIndexPermissionsValue}
          />
        )}

        <EuiFormRow label="GitHub App ID">
          <EuiFieldText value={githubAppId} onChange={(e) => setGithubAppId(e.target.value)} />
        </EuiFormRow>
        {isGithubEnterpriseServer && (
          <EuiFormRow label="Base URL">
            <EuiFieldText
              value={githubEnterpriseServerUrl}
              onChange={(e) => setGithubEnterpriseServerUrl(e.target.value)}
            />
          </EuiFormRow>
        )}
        <EuiFormRow label="Private key" helpText="Upload private key (.pem) to authenticate GitHub">
          <EuiFilePicker
            onChange={(files) => handlePrivateKeyUpload(files, setStagedPrivateKey)}
            accept=".pem"
          />
        </EuiFormRow>
        <EuiButton
          fill
          type="submit"
          isLoading={isSubmitButtonLoading}
          isDisabled={
            // disable submit button if any required fields are empty
            !githubAppId ||
            (isGithubEnterpriseServer && !githubEnterpriseServerUrl) ||
            !stagedPrivateKey
          }
        >
          {isSubmitButtonLoading ? 'Connecting…' : `Connect ${name}`}
        </EuiButton>
      </form>
    </Layout>
  );
};

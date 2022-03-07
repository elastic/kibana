/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LicensingLogic } from '../../../../../shared/licensing';
import { AppLogic } from '../../../../app_logic';
import { FeatureIds, Configuration, Features } from '../../../../types';

import { AddSourceLogic } from './add_source_logic';
import { DocumentPermissionsCallout } from './document_permissions_callout';
import { DocumentPermissionsField } from './document_permissions_field';
import { SourceFeatures } from './source_features';

interface ConnectInstanceProps {
  header: React.ReactNode;
  configuration: Configuration;
  features?: Features;
  objTypes?: string[];
  name: string;
  serviceType: string;
  needsPermissions: boolean;
  onFormCreated(name: string): void;
}

export const ConnectInstance: React.FC<ConnectInstanceProps> = ({
  configuration: { needsSubdomain, hasOauthRedirect },
  features,
  objTypes,
  name,
  serviceType,
  needsPermissions,
  onFormCreated,
  header,
}) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const {
    getSourceConnectData,
    createContentSource,
    setSourceLoginValue,
    setSourcePasswordValue,
    setSourceSubdomainValue,
    setSourceIndexPermissionsValue,
  } = useActions(AddSourceLogic);

  const { buttonLoading, loginValue, passwordValue, indexPermissionsValue, subdomainValue } =
    useValues(AddSourceLogic);

  const { isOrganization } = useValues(AppLogic);

  // Default indexPermissions to true, if needed
  useEffect(() => {
    setSourceIndexPermissionsValue(needsPermissions && isOrganization && hasPlatinumLicense);
  }, []);

  const redirectOauth = (oauthUrl: string) => window.location.replace(oauthUrl);
  const redirectFormCreated = () => onFormCreated(name);
  const onOauthFormSubmit = () => getSourceConnectData(serviceType, redirectOauth);
  const onCredentialsFormSubmit = () => createContentSource(serviceType, redirectFormCreated);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const onSubmit = hasOauthRedirect ? onOauthFormSubmit : onCredentialsFormSubmit;
    onSubmit();
  };

  const permissionsExcluded = features?.basicOrgContextExcludedFeatures?.includes(
    FeatureIds.DocumentLevelPermissions
  );

  const credentialsFields = (
    <>
      <EuiFormRow label="Login">
        <EuiFieldText
          required
          name="login"
          value={loginValue}
          onChange={(e) => setSourceLoginValue(e.target.value)}
        />
      </EuiFormRow>
      <EuiFormRow label="Password">
        <EuiFieldText
          required
          name="password"
          type="password"
          value={passwordValue}
          onChange={(e) => setSourcePasswordValue(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="xxl" />
    </>
  );

  const subdomainField = (
    <>
      <EuiFormRow label="Subdomain">
        <EuiFieldText
          required
          name="subdomain"
          value={subdomainValue}
          onChange={(e) => setSourceSubdomainValue(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="xxl" />
    </>
  );

  const permissionField = (
    <DocumentPermissionsField
      needsPermissions={needsPermissions}
      indexPermissionsValue={indexPermissionsValue}
      setValue={setSourceIndexPermissionsValue}
    />
  );

  const formFields = (
    <>
      {isOrganization && hasPlatinumLicense && permissionField}
      {!hasOauthRedirect && credentialsFields}
      {needsSubdomain && subdomainField}
      {permissionsExcluded && !hasPlatinumLicense && <DocumentPermissionsCallout />}

      <EuiFormRow>
        <EuiButton color="primary" type="submit" fill isLoading={buttonLoading}>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.contentSource.connect.button', {
            defaultMessage: 'Connect {name}',
            values: { name },
          })}
        </EuiButton>
      </EuiFormRow>
    </>
  );

  return (
    <form onSubmit={handleFormSubmit}>
      <EuiFlexGroup
        direction="row"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="xl"
        responsive={false}
      >
        <EuiFlexItem grow={1} className="adding-a-source__connect-an-instance">
          <EuiPanel paddingSize="none" hasShadow={false} color="subdued">
            <EuiPanel hasShadow={false} paddingSize="l" color="subdued">
              {header}
            </EuiPanel>
            <EuiHorizontalRule margin="xs" />
            <EuiPanel hasShadow={false} paddingSize="l" color="subdued">
              <SourceFeatures features={features} name={name} objTypes={objTypes} />
            </EuiPanel>
          </EuiPanel>
          <EuiSpacer />
          {formFields}
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
};

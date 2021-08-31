/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { LicensingLogic } from '../../../../../shared/licensing';
import { AppLogic } from '../../../../app_logic';
import { DOCUMENT_PERMISSIONS_DOCS_URL, ENT_SEARCH_LICENSE_MANAGEMENT } from '../../../../routes';
import { FeatureIds, Configuration, Features } from '../../../../types';
import { LEARN_MORE_LINK } from '../../constants';

import { AddSourceLogic } from './add_source_logic';
import {
  CONNECT_WHICH_OPTION_LINK,
  CONNECT_DOC_PERMISSIONS_LABEL,
  CONNECT_DOC_PERMISSIONS_TITLE,
  CONNECT_NEEDS_PERMISSIONS,
  CONNECT_NOT_SYNCED_TITLE,
  CONNECT_NOT_SYNCED_TEXT,
  SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE,
  SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_TITLE,
  SOURCE_FEATURES_EXPLORE_BUTTON,
} from './constants';
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
  const [formLoading, setFormLoading] = useState(false);

  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const {
    getSourceConnectData,
    createContentSource,
    setSourceLoginValue,
    setSourcePasswordValue,
    setSourceSubdomainValue,
    setSourceIndexPermissionsValue,
  } = useActions(AddSourceLogic);

  const { loginValue, passwordValue, indexPermissionsValue, subdomainValue } = useValues(
    AddSourceLogic
  );

  const { isOrganization } = useValues(AppLogic);

  // Default indexPermissions to true, if needed
  useEffect(() => {
    setSourceIndexPermissionsValue(needsPermissions && isOrganization && hasPlatinumLicense);
  }, []);

  const redirectOauth = (oauthUrl: string) => window.location.replace(oauthUrl);
  const redirectFormCreated = () => onFormCreated(name);
  const onOauthFormSubmit = () => getSourceConnectData(serviceType, redirectOauth);
  const handleFormSubmitError = () => setFormLoading(false);
  const onCredentialsFormSubmit = () =>
    createContentSource(serviceType, redirectFormCreated, handleFormSubmitError);

  const handleFormSubmit = (e: FormEvent) => {
    setFormLoading(true);
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

  const whichDocsLink = (
    <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
      {CONNECT_WHICH_OPTION_LINK}
    </EuiLink>
  );

  const permissionField = (
    <>
      <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
        <EuiTitle size="s">
          <h1>
            <strong>{CONNECT_DOC_PERMISSIONS_TITLE}</strong>
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {!needsPermissions && (
            <span>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.contentSource.connect.docPermissionsUnavailable.message"
                defaultMessage="Document-level permissions are not yet available for this source. {link}"
                values={{
                  link: (
                    <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
                      {LEARN_MORE_LINK}
                    </EuiLink>
                  ),
                }}
              />
            </span>
          )}
          {needsPermissions && indexPermissionsValue && (
            <span>
              {CONNECT_NEEDS_PERMISSIONS}
              <EuiSpacer size="s" />
              {whichDocsLink}
            </span>
          )}
        </EuiText>
        {!indexPermissionsValue && (
          <>
            <EuiCallOut title={CONNECT_NOT_SYNCED_TITLE} color="warning">
              <p>
                {CONNECT_NOT_SYNCED_TEXT}
                {needsPermissions && whichDocsLink}
              </p>
            </EuiCallOut>
          </>
        )}
        <EuiSpacer />
        <EuiSwitch
          label={<strong>{CONNECT_DOC_PERMISSIONS_LABEL}</strong>}
          name="index_permissions"
          onChange={(e) => setSourceIndexPermissionsValue(e.target.checked)}
          checked={indexPermissionsValue}
          disabled={!needsPermissions}
        />
      </EuiPanel>
      <EuiSpacer size="xl" />
    </>
  );

  const documentLevelPermissionsCallout = (
    <>
      <EuiPanel paddingSize="l" data-test-subj="DocumentLevelPermissionsCallout">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="lock" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_TITLE}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          <p>{SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          <EuiLink external target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
            {SOURCE_FEATURES_EXPLORE_BUTTON}
          </EuiLink>
        </EuiText>
      </EuiPanel>
      <EuiSpacer />
    </>
  );

  const formFields = (
    <>
      {isOrganization && hasPlatinumLicense && permissionField}
      {!hasOauthRedirect && credentialsFields}
      {needsSubdomain && subdomainField}
      {permissionsExcluded && !hasPlatinumLicense && documentLevelPermissionsCallout}

      <EuiFormRow>
        <EuiButton color="primary" type="submit" fill isLoading={formLoading}>
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

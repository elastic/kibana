/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiTextColor,
  EuiBadge,
  EuiBadgeGroup,
} from '@elastic/eui';

import { LicensingLogic } from '../../../../../../applications/shared/licensing';

import { AppLogic } from '../../../../app_logic';
import { SourceLogic } from '../../source_logic';
import { FeatureIds, Configuration, Features } from '../../../../types';
import { DOCUMENT_PERMISSIONS_DOCS_URL } from '../../../../routes';
import { SourceFeatures } from './source_features';

interface ConnectInstanceProps {
  header: React.ReactNode;
  configuration: Configuration;
  features?: Features;
  objTypes?: string[];
  name: string;
  serviceType: string;
  sourceDescription: string;
  connectStepDescription: string;
  needsPermissions: boolean;
  onFormCreated(name: string): void;
}

export const ConnectInstance: React.FC<ConnectInstanceProps> = ({
  configuration: { needsSubdomain, hasOauthRedirect },
  features,
  objTypes,
  name,
  serviceType,
  sourceDescription,
  connectStepDescription,
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
  } = useActions(SourceLogic);

  const { loginValue, passwordValue, indexPermissionsValue, subdomainValue } = useValues(
    SourceLogic
  );

  const { isOrganization } = useValues(AppLogic);

  // Default indexPermissions to true, if needed
  useEffect(() => {
    setSourceIndexPermissionsValue(needsPermissions && isOrganization && hasPlatinumLicense);
  }, []);

  const redirectOauth = (oauthUrl: string) => (window.location.href = oauthUrl);
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

  const featureBadgeGroup = () => {
    if (isOrganization) {
      return null;
    }

    const isRemote = features?.platinumPrivateContext.includes(FeatureIds.Remote);
    const isPrivate = features?.platinumPrivateContext.includes(FeatureIds.Private);

    if (isRemote || isPrivate) {
      return (
        <>
          <EuiBadgeGroup>
            {isRemote && <EuiBadge color="hollow">Remote</EuiBadge>}
            {isPrivate && <EuiBadge color="hollow">Private</EuiBadge>}
          </EuiBadgeGroup>
          <EuiSpacer />
        </>
      );
    }
  };

  const descriptionBlock = (
    <EuiText grow={false}>
      {sourceDescription && <p>{sourceDescription}</p>}
      {connectStepDescription && <p>{connectStepDescription}</p>}
      <EuiSpacer size="s" />
    </EuiText>
  );

  const whichDocsLink = (
    <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
      Which option should I choose?
    </EuiLink>
  );

  const permissionField = (
    <>
      <EuiTitle size="xs">
        <span>
          <EuiTextColor color="default">Document-level permissions</EuiTextColor>
        </span>
      </EuiTitle>
      <EuiSpacer />
      <EuiSwitch
        label={<strong>Enable document-level permission synchronization</strong>}
        name="index_permissions"
        onChange={(e) => setSourceIndexPermissionsValue(e.target.checked)}
        checked={indexPermissionsValue}
        disabled={!needsPermissions}
      />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {!needsPermissions && (
          <span>
            Document-level permissions are not yet available for this source.{' '}
            <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
              Learn more
            </EuiLink>
          </span>
        )}
        {needsPermissions && indexPermissionsValue && (
          <span>
            Document-level permission information will be synchronized. Additional configuration is
            required following the initial connection before documents are available for search.
            <br />
            {whichDocsLink}
          </span>
        )}
      </EuiText>
      <EuiSpacer size="s" />
      {!indexPermissionsValue && (
        <EuiCallOut title="Document-level permissions will not be synchronized" color="warning">
          <p>
            All documents accessible to the connecting service user will be synchronized and made
            available to the organization’s users, or group’s users. Documents are immediately
            available for search. {needsPermissions && whichDocsLink}
          </p>
        </EuiCallOut>
      )}
      <EuiSpacer size="xxl" />
    </>
  );

  const formFields = (
    <>
      {isOrganization && hasPlatinumLicense && permissionField}
      {!hasOauthRedirect && credentialsFields}
      {needsSubdomain && subdomainField}

      <EuiFormRow>
        <EuiButton color="primary" type="submit" fill isLoading={formLoading}>
          Connect {name}
        </EuiButton>
      </EuiFormRow>
    </>
  );

  return (
    <div className="step-4">
      <form onSubmit={handleFormSubmit}>
        <EuiFlexGroup
          direction="row"
          alignItems="flexStart"
          justifyContent="spaceBetween"
          gutterSize="xl"
          responsive={false}
        >
          <EuiFlexItem grow={2} className="adding-a-source__connect-an-instance">
            {header}
            {featureBadgeGroup()}
            {descriptionBlock}
            {formFields}
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <SourceFeatures features={features} name={name} objTypes={objTypes} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </form>
    </div>
  );
};

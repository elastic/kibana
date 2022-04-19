/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LicensingLogic } from '../../../../../shared/licensing';
import { ApiKey } from '../../../../components/shared/api_key';
import {
  PUBLIC_KEY_LABEL,
  CONSUMER_KEY_LABEL,
  BASE_URI_LABEL,
  BASE_URL_LABEL,
  CLIENT_ID_LABEL,
  CLIENT_SECRET_LABEL,
  REMOVE_BUTTON,
} from '../../../../constants';
import { Configuration } from '../../../../types';

import { ExternalConnectorFormFields } from './add_external_connector';
import { ExternalConnectorDocumentation } from './add_external_connector';
import { AddSourceLogic } from './add_source_logic';
import { ConfigDocsLinks } from './config_docs_links';
import { OAUTH_SAVE_CONFIG_BUTTON, OAUTH_BACK_BUTTON, OAUTH_STEP_2 } from './constants';

interface SaveConfigProps {
  header: React.ReactNode;
  name: string;
  configuration: Configuration;
  advanceStep(): void;
  goBackStep?(): void;
  onDeleteConfig?(): void;
}

export const SaveConfig: React.FC<SaveConfigProps> = ({
  name,
  configuration: {
    isPublicKey,
    needsBaseUrl,
    documentationUrl,
    applicationPortalUrl,
    applicationLinkTitle,
    baseUrlTitle,
  },
  advanceStep,
  goBackStep,
  onDeleteConfig,
  header,
}) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const { setClientIdValue, setClientSecretValue, setBaseUrlValue } = useActions(AddSourceLogic);

  const { sourceConfigData, buttonLoading, clientIdValue, clientSecretValue, baseUrlValue } =
    useValues(AddSourceLogic);

  const {
    accountContextOnly,
    configuredFields: { publicKey, consumerKey },
    serviceType,
  } = sourceConfigData;

  const handleFormSubmission = (e: FormEvent) => {
    e.preventDefault();
    advanceStep();
  };

  const saveButton = (
    <EuiButton color="primary" fill isLoading={buttonLoading} type="submit">
      {OAUTH_SAVE_CONFIG_BUTTON}
    </EuiButton>
  );

  const deleteButton = (
    <EuiButton color="danger" fill disabled={buttonLoading} onClick={onDeleteConfig}>
      {REMOVE_BUTTON}
    </EuiButton>
  );

  const backButton = <EuiButtonEmpty onClick={goBackStep}>{OAUTH_BACK_BUTTON}</EuiButtonEmpty>;
  const showSaveButton = hasPlatinumLicense || !accountContextOnly;

  const formActions = (
    <EuiFormRow>
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m" responsive={false}>
        {showSaveButton && <EuiFlexItem grow={false}>{saveButton}</EuiFlexItem>}
        <EuiFlexItem grow={false}>
          {goBackStep && backButton}
          {onDeleteConfig && deleteButton}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );

  const publicKeyStep1 = (
    <EuiFlexGroup justifyContent="flexStart" direction="column" responsive={false}>
      <ConfigDocsLinks
        name={name}
        documentationUrl={documentationUrl}
        applicationPortalUrl={applicationPortalUrl}
        applicationLinkTitle={applicationLinkTitle}
      />
      <EuiSpacer />
      <EuiFlexGroup direction="column" justifyContent="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <ApiKey label={PUBLIC_KEY_LABEL} apiKey={publicKey || ''} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ApiKey label={CONSUMER_KEY_LABEL} apiKey={consumerKey || ''} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </EuiFlexGroup>
  );

  const credentialsStep1 = (
    <ConfigDocsLinks
      name={name}
      documentationUrl={documentationUrl}
      applicationPortalUrl={applicationPortalUrl}
      applicationLinkTitle={applicationLinkTitle}
    />
  );

  const publicKeyStep2 = (
    <>
      {serviceType === 'external' && <ExternalConnectorFormFields />}
      <EuiFormRow label={BASE_URI_LABEL}>
        <EuiFieldText
          value={baseUrlValue}
          required
          type="text"
          autoComplete="off"
          onChange={(e) => setBaseUrlValue(e.target.value)}
          name="base-uri"
        />
      </EuiFormRow>
      <EuiSpacer />
      {formActions}
    </>
  );

  const credentialsStep2 = (
    <EuiFlexGroup direction="column" responsive={false}>
      <EuiFlexItem>
        <EuiForm>
          {serviceType === 'external' && <ExternalConnectorFormFields />}
          <EuiFormRow label={CLIENT_ID_LABEL}>
            <EuiFieldText
              value={clientIdValue}
              required
              type="text"
              autoComplete="off"
              onChange={(e) => setClientIdValue(e.target.value)}
              name="client-id"
            />
          </EuiFormRow>
          <EuiFormRow label={CLIENT_SECRET_LABEL}>
            <EuiFieldText
              value={clientSecretValue}
              required
              type="text"
              autoComplete="off"
              onChange={(e) => setClientSecretValue(e.target.value)}
              name="client-secret"
            />
          </EuiFormRow>
          {needsBaseUrl && (
            <EuiFormRow label={baseUrlTitle || BASE_URL_LABEL}>
              <EuiFieldText
                value={baseUrlValue}
                required
                type="text"
                autoComplete="off"
                onChange={(e) => setBaseUrlValue(e.target.value)}
                name="base-url"
              />
            </EuiFormRow>
          )}
          <EuiSpacer />
          {formActions}
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const oauthSteps = (sourceName: string) => [
    i18n.translate('xpack.enterpriseSearch.workplaceSearch.contentSource.saveConfig.oauthStep1', {
      defaultMessage: "Create an OAuth app in your organization's {sourceName} account",
      values: { sourceName },
    }),
    OAUTH_STEP_2,
  ];

  const configSteps = [
    {
      title: oauthSteps(name)[0],
      children: isPublicKey ? publicKeyStep1 : credentialsStep1,
    },
    {
      title: oauthSteps(name)[1],
      children: isPublicKey ? publicKeyStep2 : credentialsStep2,
    },
  ];

  return (
    <>
      {header}
      <EuiSpacer size="l" />
      {serviceType === 'external' && (
        <>
          <ExternalConnectorDocumentation name={name} documentationUrl={documentationUrl} />
          <EuiSpacer size="l" />
        </>
      )}
      <form onSubmit={handleFormSubmission}>
        <EuiSteps steps={configSteps} className="adding-a-source__config-steps" />
      </form>
    </>
  );
};

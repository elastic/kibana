/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

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

import { AppLogic } from '../../../../app_logic';
import { ApiKey } from '../../../../components/shared/api_key';
import { SourceLogic } from '../../source_logic';
import { Configuration } from '../../../../types';

import { ConfigDocsLinks } from './config_docs_links';

interface SaveConfigProps {
  header: React.ReactNode;
  name: string;
  configuration: Configuration;
  advanceStep();
  goBackStep?();
  onDeleteConfig?();
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
  const { setClientIdValue, setClientSecretValue, setBaseUrlValue } = useActions(SourceLogic);

  const {
    sourceConfigData,
    buttonLoading,
    clientIdValue,
    clientSecretValue,
    baseUrlValue,
  } = useValues(SourceLogic);

  const {
    accountContextOnly,
    configuredFields: { publicKey, consumerKey },
  } = sourceConfigData;
  const {
    fpAccount: { minimumPlatinumLicense },
  } = useValues(AppLogic);

  const handleFormSubmission = (e) => {
    e.preventDefault();
    advanceStep();
  };

  const saveButton = (
    <EuiButton color="primary" fill isLoading={buttonLoading} type="submit">
      Save configuration
    </EuiButton>
  );

  const deleteButton = (
    <EuiButton color="danger" fill disabled={buttonLoading} onClick={onDeleteConfig}>
      Remove
    </EuiButton>
  );

  const backButton = <EuiButtonEmpty onClick={goBackStep}>&nbsp;Go back</EuiButtonEmpty>;
  const showSaveButton = minimumPlatinumLicense || !accountContextOnly;

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
          <ApiKey label="Public Key" apiKey={publicKey} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ApiKey label="Consumer Key" apiKey={consumerKey} />
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
      <EuiFormRow label="Base URI">
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
          <EuiFormRow label="Client id">
            <EuiFieldText
              value={clientIdValue}
              required
              type="text"
              autoComplete="off"
              onChange={(e) => setClientIdValue(e.target.value)}
              name="client-id"
            />
          </EuiFormRow>
          <EuiFormRow label="Client secret">
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
            <EuiFormRow label={baseUrlTitle || 'Base URL'}>
              <EuiFieldText
                value={baseUrlValue}
                required
                type="text"
                autoComplete="off"
                onChange={(e) => setBaseUrlValue(e.target.value)}
                name="base-uri"
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
    `Create an OAuth app in your organization's ${sourceName}\u00A0account`,
    'Provide the appropriate configuration information',
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
      <form onSubmit={handleFormSubmission}>
        <EuiSteps steps={configSteps} className="adding-a-source__config-steps" />
      </form>
    </>
  );
};

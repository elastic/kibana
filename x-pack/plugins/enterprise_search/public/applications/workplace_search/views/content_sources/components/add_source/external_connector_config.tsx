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

import { AddSourceLogic } from './add_source_logic';
import { ConfigDocsLinks } from './config_docs_links';
import { OAUTH_SAVE_CONFIG_BUTTON, OAUTH_BACK_BUTTON, OAUTH_STEP_2 } from './constants';

interface SaveConfigProps {
  header: React.ReactNode;
  name: string;
  // configuration: Configuration;
  advanceStep(): void;
  goBackStep?(): void;
  onDeleteConfig?(): void;
}

export const ExternalConnectorConfig: React.FC<SaveConfigProps> = ({
  name,
  // configuration: {
  //   isPublicKey,
  //   needsBaseUrl,
  //   documentationUrl,
  //   applicationPortalUrl,
  //   applicationLinkTitle,
  //   baseUrlTitle,
  // },
  goBackStep,
  onDeleteConfig,
  header,
}) => {
  const { setExternalConnectorApiKey, setExternalConnectorUrl, saveExternalConnectorConfig } =
    useActions(AddSourceLogic);

  const { buttonLoading, externalConnectorUrl, externalConnectorApiKey } =
    useValues(AddSourceLogic);

  const handleFormSubmission = (e: FormEvent) => {
    e.preventDefault();
    saveExternalConnectorConfig({ url: externalConnectorUrl, apiKey: externalConnectorApiKey });
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

  const formActions = (
    <EuiFormRow>
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>{saveButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {goBackStep && backButton}
          {onDeleteConfig && deleteButton}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );

  const connectorForm = (
    <EuiFlexGroup justifyContent="flexStart" direction="column" responsive={false}>
      {/* <ConfigDocsLinks
        name={name}
        documentationUrl={documentationUrl}
        applicationPortalUrl={applicationPortalUrl}
        applicationLinkTitle={applicationLinkTitle}
      /> */}
      <EuiSpacer />
      <EuiForm>
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.urlLabel',
            {
              defaultMessage: 'URL',
            }
          )}
        >
          <EuiFieldText
            value={externalConnectorUrl}
            required
            type="text"
            autoComplete="off"
            onChange={(e) => setExternalConnectorUrl(e.target.value)}
            name="external-connector-uri"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.urlLabel',
            {
              defaultMessage: 'API key',
            }
          )}
        >
          <EuiFieldText
            value={externalConnectorApiKey}
            required
            type="text"
            autoComplete="off"
            onChange={(e) => setExternalConnectorApiKey(e.target.value)}
            name="external-connector-api-key"
          />
        </EuiFormRow>
        <EuiSpacer />
        {formActions}
      </EuiForm>
    </EuiFlexGroup>
  );

  const configSteps = [
    {
      title: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.stepTitle',
        {
          defaultMessage: 'Provide the appropriate configuration information',
        }
      ),
      children: connectorForm,
    },
  ];

  return (
    <>
      {header}
      <EuiSpacer size="l" />
      <form onSubmit={handleFormSubmission}>
        <EuiSteps steps={configSteps} />
      </form>
    </>
  );
};

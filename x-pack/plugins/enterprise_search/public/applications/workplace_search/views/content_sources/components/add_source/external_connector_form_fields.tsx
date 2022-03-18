/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ExternalConnectorLogic } from './external_connector_logic';

export const ExternalConnectorFormFields: React.FC = () => {
  const {
    urlValid,
    externalConnectorApiKey,
    externalConnectorUrl,
    formDisabled,
    showInsecureUrlCallout,
  } = useValues(ExternalConnectorLogic);
  const { validateUrl, setExternalConnectorApiKey, setExternalConnectorUrl } =
    useActions(ExternalConnectorLogic);

  return (
    <>
      {showInsecureUrlCallout && (
        <>
          <EuiCallOut
            color="danger"
            iconType="alert"
            title={i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.insecureTitle',
              {
                defaultMessage: 'Connection not secure',
              }
            )}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.insecureWarning',
              {
                defaultMessage:
                  'Your connector is using an HTTP connection, which is not private. Information synced by this connector could be viewed by others. Connect over HTTPS to secure your information.',
              }
            )}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.urlLabel',
          {
            defaultMessage: 'URL',
          }
        )}
        isInvalid={!urlValid}
        helpText={i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.helpText',
          {
            defaultMessage: 'URLs should start with https://',
          }
        )}
        error={
          urlValid
            ? []
            : [
                i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.error',
                  {
                    defaultMessage: 'Please use a valid URL',
                  }
                ),
              ]
        }
      >
        <EuiFieldText
          value={externalConnectorUrl}
          disabled={formDisabled}
          onBlur={validateUrl}
          required
          type="text"
          autoComplete="off"
          onChange={(e) => setExternalConnectorUrl(e.target.value)}
          name="external-connector-url"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.apiKeyLabel',
          {
            defaultMessage: 'API key',
          }
        )}
      >
        <EuiFieldText
          value={externalConnectorApiKey}
          disabled={formDisabled}
          required
          type="text"
          autoComplete="off"
          onChange={(e) => setExternalConnectorApiKey(e.target.value)}
          name="external-connector-api-key"
        />
      </EuiFormRow>
    </>
  );
};

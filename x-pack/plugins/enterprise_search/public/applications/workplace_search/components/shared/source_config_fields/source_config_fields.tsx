/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  PUBLIC_KEY_LABEL,
  CONSUMER_KEY_LABEL,
  EXTERNAL_CONNECTOR_API_KEY_LABEL,
  EXTERNAL_CONNECTOR_URL_LABEL,
  COPIED_TOOLTIP,
  COPY_TOOLTIP,
} from '../../../constants';
import {
  SourceConfigData,
  SourceConfigFormElement,
} from '../../../views/content_sources/components/add_source/add_source_logic';
import { ApiKey } from '../api_key';
import { CredentialItem } from '../credential_item';

interface SourceConfigFieldsProps {
  isOauth1?: boolean;
  sourceConfigData: SourceConfigData;
}

export const SourceConfigFields: React.FC<SourceConfigFieldsProps> = ({
  isOauth1,
  sourceConfigData,
}) => {
  const { configuredFields, configurableFields = [], serviceType } = sourceConfigData;

  // TODO use configurableFields instead of static field names
  const {
    public_key: publicKey,
    consumer_key: consumerKey,
    external_connector_api_key: externalConnectorApiKey,
    external_connector_url: externalConnectorUrl,
  } = configuredFields;

  const credentialItem = (label: string, item?: string) =>
    item && (
      <div key={label}>
        <EuiSpacer size="s" />
        <CredentialItem label={label} value={item} testSubj={label} hideCopy />
      </div>
    );

  const keyElement = (
    <>
      {publicKey && (
        <>
          <ApiKey label={PUBLIC_KEY_LABEL} apiKey={publicKey} />
          <EuiSpacer />
        </>
      )}
      {consumerKey && (
        <>
          <ApiKey label={CONSUMER_KEY_LABEL} apiKey={consumerKey} />
          <EuiSpacer />
        </>
      )}
    </>
  );

  const formFields: SourceConfigFormElement[] =
    serviceType === 'external'
      ? configurableFields
      : [
          {
            key: 'client_id',
            label: i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.sourceConfigFields.clientIDLabel',
              {
                defaultMessage: 'Client ID',
              }
            ),
          },
          {
            key: 'client_secret',
            label: i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.sourceConfigFields.clientSecretLabel',
              {
                defaultMessage: 'Client Secret',
              }
            ),
          },
          {
            key: 'base_url',
            label: i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.sourceConfigFields.baseUrlLabel',
              {
                defaultMessage: 'Base URL',
              }
            ),
          },
        ];

  return (
    <>
      {isOauth1 && keyElement}
      {formFields.map(({ key, label }) => credentialItem(label, configuredFields[key]))}
      {credentialItem(EXTERNAL_CONNECTOR_API_KEY_LABEL, externalConnectorApiKey)}
      {externalConnectorUrl && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={1}>
              <EuiText size="s">
                <strong>{EXTERNAL_CONNECTOR_URL_LABEL}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiCopy
                    beforeMessage={COPY_TOOLTIP}
                    afterMessage={COPIED_TOOLTIP}
                    textToCopy={externalConnectorUrl}
                  >
                    {(copy) => (
                      <EuiButtonIcon
                        aria-label={COPY_TOOLTIP}
                        onClick={copy}
                        iconType="copy"
                        color="primary"
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    readOnly
                    placeholder="https://URL"
                    data-test-subj="external-connector-url-input"
                    value={externalConnectorUrl}
                    compressed
                    onClick={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.select()}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

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

import {
  PUBLIC_KEY_LABEL,
  CONSUMER_KEY_LABEL,
  BASE_URL_LABEL,
  CLIENT_ID_LABEL,
  CLIENT_SECRET_LABEL,
  EXTERNAL_CONNECTOR_API_KEY_LABEL,
  EXTERNAL_CONNECTOR_URL_LABEL,
  COPIED_TOOLTIP,
  COPY_TOOLTIP,
} from '../../../constants';
import { SourceConfigData } from '../../../views/content_sources/components/add_source/add_source_logic';
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
  const { configuredFields } = sourceConfigData;

  // TODO use configurableFields instead of static field names
  const {
    public_key: publicKey,
    consumer_key: consumerKey,
    client_id: clientId,
    client_secret: clientSecret,
    base_url: baseUrl,
    external_connector_api_key: externalConnectorApiKey,
    external_connector_url: externalConnectorUrl,
  } = configuredFields;

  const credentialItem = (label: string, item?: string) =>
    item && (
      <>
        <EuiSpacer size="s" />
        <CredentialItem label={label} value={item} testSubj={label} hideCopy />
      </>
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

  return (
    <>
      {isOauth1 && keyElement}
      {!isOauth1 && credentialItem(CLIENT_ID_LABEL, clientId)}
      {!isOauth1 && credentialItem(CLIENT_SECRET_LABEL, clientSecret)}
      {credentialItem(BASE_URL_LABEL, baseUrl)}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import { ApiKey } from '../api_key';
import { CredentialItem } from '../credential_item';

interface SourceConfigFieldsProps {
  clientId?: string;
  clientSecret?: string;
  publicKey?: string;
  consumerKey?: string;
  baseUrl?: string;
}

export const SourceConfigFields: React.FC<SourceConfigFieldsProps> = ({
  clientId,
  clientSecret,
  publicKey,
  consumerKey,
  baseUrl,
}) => {
  const showApiKey = (publicKey || consumerKey) && !clientId;

  const credentialItem = (label: string, item?: string) =>
    item && <CredentialItem label={label} value={item} testSubj={label} hideCopy />;

  const keyElement = (
    <>
      {publicKey && (
        <>
          <ApiKey label="Public Key" apiKey={publicKey} />
          <EuiSpacer />
        </>
      )}
      {consumerKey && (
        <>
          <ApiKey label="Consumer Key" apiKey={consumerKey} />
          <EuiSpacer />
        </>
      )}
    </>
  );

  return (
    <>
      {showApiKey && keyElement}
      {credentialItem('Client id', clientId)}
      <EuiSpacer size="s" />
      {credentialItem('Client secret', clientSecret)}
      <EuiSpacer size="s" />
      {credentialItem('Base URL', baseUrl)}
    </>
  );
};

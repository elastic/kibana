/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import {
  PUBLIC_KEY_LABEL,
  CONSUMER_KEY_LABEL,
  BASE_URL_LABEL,
  CLIENT_ID_LABEL,
  CLIENT_SECRET_LABEL,
} from '../../../constants';
import { ApiKey } from '../api_key';
import { CredentialItem } from '../credential_item';

interface SourceConfigFieldsProps {
  isOauth1?: boolean;
  clientId?: string;
  clientSecret?: string;
  publicKey?: string;
  consumerKey?: string;
  baseUrl?: string;
}

export const SourceConfigFields: React.FC<SourceConfigFieldsProps> = ({
  isOauth1,
  clientId,
  clientSecret,
  publicKey,
  consumerKey,
  baseUrl,
}) => {
  const credentialItem = (label: string, item?: string) =>
    item && <CredentialItem label={label} value={item} testSubj={label} hideCopy />;

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
      <EuiSpacer size="s" />
      {!isOauth1 && credentialItem(CLIENT_SECRET_LABEL, clientSecret)}
      <EuiSpacer size="s" />
      {credentialItem(BASE_URL_LABEL, baseUrl)}
    </>
  );
};

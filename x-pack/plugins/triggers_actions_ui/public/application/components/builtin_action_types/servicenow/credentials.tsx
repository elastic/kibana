/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import * as i18n from './translations';
import { CredentialsApiUrl } from './credentials_api_url';
import { CredentialsAuth } from './credentials_auth';

interface Props {
  readOnly: boolean;
  isLoading: boolean;
}

const CredentialsComponent: React.FC<Props> = ({ readOnly, isLoading }) => {
  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.SN_INSTANCE_LABEL}</h4>
          </EuiTitle>
          <CredentialsApiUrl readOnly={readOnly} isLoading={isLoading} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTHENTICATION_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <CredentialsAuth readOnly={readOnly} isLoading={isLoading} />
      </EuiFlexItem>
    </>
  );
};

export const Credentials = memo(CredentialsComponent);

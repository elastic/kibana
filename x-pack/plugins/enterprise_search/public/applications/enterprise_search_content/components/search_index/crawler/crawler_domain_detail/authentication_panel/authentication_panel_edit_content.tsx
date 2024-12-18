/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiForm,
  EuiFieldText,
  EuiFieldPassword,
  EuiFormRow,
  EuiTitle,
  EuiCheckableCard,
  EuiFormFieldset,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { USERNAME_LABEL, PASSWORD_LABEL } from '../../../../../../shared/constants';

import { AuthenticationPanelLogic } from './authentication_panel_logic';
import { AUTHENTICATION_LABELS } from './constants';

export const AuthenticationPanelEditContent: React.FC = () => {
  const { selectAuthOption, setHeaderContent, setPassword, setUsername } =
    useActions(AuthenticationPanelLogic);

  const { headerContent, username, password, selectedAuthOption } =
    useValues(AuthenticationPanelLogic);

  return (
    <EuiFormFieldset>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiCheckableCard
            data-telemetry-id="entSearchContent-crawler-domainDetail-authentication-basicAuthentication"
            id="basicAuthenticationCheckableCard"
            name="authenticationCard"
            className="authenticationCheckable"
            label={
              <EuiTitle size="xxs">
                <h5>{AUTHENTICATION_LABELS.basic}</h5>
              </EuiTitle>
            }
            value="basic"
            checked={selectedAuthOption === 'basic'}
            onChange={() => selectAuthOption('basic')}
          >
            <EuiForm>
              <EuiFormRow label={USERNAME_LABEL}>
                <EuiFieldText
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={selectedAuthOption !== 'basic'}
                />
              </EuiFormRow>
              <EuiFormRow label={PASSWORD_LABEL}>
                <EuiFieldPassword
                  type="dual"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={selectedAuthOption !== 'basic'}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiCheckableCard>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckableCard
            data-telemetry-id="entSearchContent-crawler-domainDetail-authentication-authenticationHeader"
            id="authenticationHeaderCheckableCard"
            name="authenticationCard"
            className="authenticationCheckable"
            label={
              <EuiTitle size="xxs">
                <h5>{AUTHENTICATION_LABELS.raw}</h5>
              </EuiTitle>
            }
            value="raw"
            checked={selectedAuthOption === 'raw'}
            onChange={() => selectAuthOption('raw')}
          >
            <EuiForm>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.editForm.headerValueLabel',
                  {
                    defaultMessage: 'Header value',
                  }
                )}
              >
                <EuiFieldPassword
                  type="dual"
                  value={headerContent}
                  onChange={(event) => setHeaderContent(event.target.value)}
                  disabled={selectedAuthOption !== 'raw'}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiCheckableCard>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormFieldset>
  );
};

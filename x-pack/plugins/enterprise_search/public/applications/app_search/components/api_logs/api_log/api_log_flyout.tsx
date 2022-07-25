/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPortal,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBadge,
  EuiHealth,
  EuiText,
  EuiCode,
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getStatusColor, attemptToFormatJson } from '../utils';

import { ApiLogLogic } from '.';

export const ApiLogFlyout: React.FC = () => {
  const { isFlyoutOpen, apiLog } = useValues(ApiLogLogic);
  const { closeFlyout } = useActions(ApiLogLogic);

  if (!isFlyoutOpen) return null;
  if (!apiLog) return null;

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="apiLogFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="apiLogFlyout">
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.flyout.title', {
                defaultMessage: 'Request details',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <ApiLogHeading>
                {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.methodTitle', {
                  defaultMessage: 'Method',
                })}
              </ApiLogHeading>
              <div>
                <EuiBadge color="primary">{apiLog.http_method}</EuiBadge>
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <ApiLogHeading>
                {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.statusTitle', {
                  defaultMessage: 'Status',
                })}
              </ApiLogHeading>
              <EuiHealth color={getStatusColor(apiLog.status)}>{apiLog.status}</EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem>
              <ApiLogHeading>
                {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.timestampTitle', {
                  defaultMessage: 'Timestamp',
                })}
              </ApiLogHeading>
              {apiLog.timestamp}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />

          <ApiLogHeading>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.userAgentTitle', {
              defaultMessage: 'User agent',
            })}
          </ApiLogHeading>
          <EuiText>
            <EuiCode>{apiLog.user_agent}</EuiCode>
          </EuiText>
          <EuiSpacer />

          <ApiLogHeading>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.requestPathTitle', {
              defaultMessage: 'Request path',
            })}
          </ApiLogHeading>
          <EuiText>
            <EuiCode>{apiLog.full_request_path}</EuiCode>
          </EuiText>
          <EuiSpacer />

          <ApiLogHeading>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.requestBodyTitle', {
              defaultMessage: 'Request body',
            })}
          </ApiLogHeading>
          <EuiCodeBlock language="json" paddingSize="m">
            {attemptToFormatJson(apiLog.request_body)}
          </EuiCodeBlock>
          <EuiSpacer />

          <ApiLogHeading>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.responseBodyTitle', {
              defaultMessage: 'Response body',
            })}
          </ApiLogHeading>
          <EuiCodeBlock language="json" paddingSize="m">
            {attemptToFormatJson(apiLog.response_body)}
          </EuiCodeBlock>
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

export const ApiLogHeading: React.FC = ({ children }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { APIReturnType } from '../../../services/rest/create_call_api';

type ApiKeyPayload = APIReturnType<'POST /internal/observability_onboarding/logs/flow'>;

export type HasPrivileges = boolean;

export function ApiKeyBanner({
  hasPrivileges = true,
  status,
  payload,
  error,
}: {
  hasPrivileges?: boolean;
  status: FETCH_STATUS;
  payload?: Partial<ApiKeyPayload>;
  error?: IHttpFetchError<ResponseErrorBody>;
}) {
  const loadingCallout = (
    <EuiCallOut
      title={
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.observability_onboarding.apiKeyBanner.loading', {
              defaultMessage: 'Creating API Key',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      color="primary"
      data-test-subj="obltOnboardingLogsCreatingApiKey"
    />
  );

  const apiKeySuccessCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.observability_onboarding.apiKeyBanner.created', {
        defaultMessage: 'API Key created.',
      })}
      color="success"
      iconType="check"
      data-test-subj="obltOnboardingLogsApiKeyCreated"
    >
      <p>
        {i18n.translate('xpack.observability_onboarding.apiKeyBanner.created.description', {
          defaultMessage:
            'Remember to store this information in a safe place. It won’t be displayed anymore after you continue.',
        })}
      </p>
      <EuiFieldText
        data-test-subj="apmAgentKeyCallOutFieldText"
        readOnly
        value={payload?.apiKeyEncoded}
        aria-label={i18n.translate('xpack.observability_onboarding.apiKeyBanner.field.label', {
          defaultMessage: 'Api Key',
        })}
        append={
          <EuiCopy textToCopy={payload?.apiKeyEncoded ?? ''}>
            {(copy) => (
              <EuiButtonIcon
                data-test-subj="observabilityOnboardingApiKeySuccessCalloutButton"
                iconType="copyClipboard"
                onClick={copy}
                color="accentSecondary"
                css={{
                  '> svg.euiIcon': {
                    borderRadius: '0 !important',
                  },
                }}
                aria-label={i18n.translate(
                  'xpack.observability_onboarding.apiKeyBanner.field.copyButton',
                  {
                    defaultMessage: 'Copy to clipboard',
                  }
                )}
              />
            )}
          </EuiCopy>
        }
      />
    </EuiCallOut>
  );

  const apiKeyFailureCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.observability_onboarding.apiKeyBanner.failed', {
        defaultMessage: 'Failed to create API key.',
      })}
      color="danger"
      iconType="error"
      data-test-subj="obltOnboardingLogsApiKeyCreationFailed"
    >
      <p>
        {i18n.translate('xpack.observability_onboarding.apiKeyBanner.failed.description', {
          defaultMessage: 'Something went wrong: {message}',
          values: {
            message: error?.body?.message,
          },
        })}
      </p>
    </EuiCallOut>
  );

  const noPermissionsCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.observability_onboarding.apiKeyBanner.noPermissions', {
        defaultMessage: 'User does not have permissions to create API key.',
      })}
      color="warning"
      iconType="warning"
      data-test-subj="obltOnboardingLogsApiKeyCreationNoPrivileges"
    >
      <p>
        {i18n.translate('xpack.observability_onboarding.apiKeyBanner.noPermissions.description', {
          defaultMessage:
            'Required cluster privileges are {requiredClusterPrivileges} and required index privileges are {requiredIndexPrivileges} for indices {indices}, please add all required privileges to the role of the authenticated user.',
          values: {
            requiredClusterPrivileges: "['monitor', 'manage_own_api_key']",
            requiredIndexPrivileges: "['auto_configure', 'create_doc']",
            indices: "['logs-*-*', 'metrics-*-*']",
          },
        })}
      </p>
    </EuiCallOut>
  );

  if (!hasPrivileges) {
    return noPermissionsCallout;
  }

  if (status === FETCH_STATUS.SUCCESS) {
    return apiKeySuccessCallout;
  }

  if (status === FETCH_STATUS.FAILURE) {
    return apiKeyFailureCallout;
  }

  return loadingCallout;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ApiKeyCallout({
  isSuccess,
  isError,
  errorMessage,
}: {
  isSuccess: boolean;
  isError: boolean;
  errorMessage?: string;
}) {
  if (isSuccess) {
    return (
      <>
        <EuiCallOut
          title={i18n.translate(
            'xpack.apm.onboarding.apiKey.success.calloutTitle',
            {
              defaultMessage: 'API key created',
            }
          )}
          color="success"
          iconType="check"
          data-test-subj="apiKeySuccessCallout"
        >
          {i18n.translate(
            'xpack.apm.onboarding.apiKey.success.calloutMessage',
            {
              defaultMessage: `Remember to store this information in a safe place. It won't be displayed anymore after you continue`,
            }
          )}
        </EuiCallOut>
      </>
    );
  }

  const regex = /missing the following requested privilege\(s\)/;
  const isInsufficientPermissionsError =
    isError && regex.test(errorMessage || '');

  if (isInsufficientPermissionsError) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.onboarding.apiKey.warning.calloutTitle',
          {
            defaultMessage: 'User does not have permissions to create API Key',
          }
        )}
        color="warning"
        iconType="warning"
        data-test-subj="apiKeyWarningCallout"
      >
        {i18n.translate('xpack.apm.onboarding.apiKey.warning.calloutMessage', {
          defaultMessage:
            'User is missing the following privilege - {missingPrivilege}. Please add the missing APM application privilege to the role of the authenticated user',
          values: {
            missingPrivilege: 'event:write',
          },
        })}
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.onboarding.apiKey.error.calloutTitle', {
        defaultMessage: 'Failed to create API key',
      })}
      color="danger"
      iconType="error"
      data-test-subj="apiKeyErrorCallout"
    >
      {i18n.translate('xpack.apm.onboarding.apiKey.error.calloutMessage', {
        defaultMessage: 'Error: {errorMessage}',
        values: {
          errorMessage,
        },
      })}
    </EuiCallOut>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocLink } from '../components/doc_link';

export interface ApiKeysEmptyPromptProps {
  error?: Error;
}

export const ApiKeysEmptyPrompt: FunctionComponent<ApiKeysEmptyPromptProps> = ({
  error,
  children,
}) => {
  if (error) {
    if (doesErrorIndicateAPIKeysAreDisabled(error)) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.security.accountManagement.apiKeys.disabledErrorMessage"
                  defaultMessage="API keys are disabled."
                />
              </p>
              <p>
                <DocLink app="elasticsearch" doc="security-settings.html#api-key-service-settings">
                  <FormattedMessage
                    id="xpack.security.accountManagement.apiKeys.docsLinkText"
                    defaultMessage="Learn how to enable API keys."
                  />
                </DocLink>
              </p>
            </>
          }
        />
      );
    }

    if (doesErrorIndicateUserHasNoPermissionsToManageAPIKeys(error)) {
      return (
        <EuiEmptyPrompt
          iconType="lock"
          body={
            <p>
              <FormattedMessage
                id="xpack.security.accountManagement.apiKeys.forbiddenErrorMessage"
                defaultMessage="Not authorised to manage API keys."
              />
            </p>
          }
        />
      );
    }

    return (
      <EuiEmptyPrompt
        iconType="alert"
        body={
          <p>
            <FormattedMessage
              id="xpack.security.accountManagement.apiKeys.errorMessage"
              defaultMessage="Could not load API keys."
            />
          </p>
        }
        actions={children}
      />
    );
  }

  return (
    <EuiEmptyPrompt
      iconType="gear"
      title={
        <h1>
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeys.emptyTitle"
            defaultMessage="Create your first API key"
          />
        </h1>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeys.emptyMessage"
            defaultMessage="Allow applications to access the stack on your behalf."
          />
        </p>
      }
      actions={children}
    />
  );
};

function doesErrorIndicateAPIKeysAreDisabled(error: Record<string, any>) {
  const message = error.body?.message || '';
  return message.indexOf('disabled.feature="api_keys"') !== -1;
}

function doesErrorIndicateUserHasNoPermissionsToManageAPIKeys(error: Record<string, any>) {
  return error.body?.statusCode === 403;
}

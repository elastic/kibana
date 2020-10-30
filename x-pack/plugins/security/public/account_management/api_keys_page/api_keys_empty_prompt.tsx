/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export interface ApiKeysEmptyPromptProps {
  error?: Error;
}

export const ApiKeysEmptyPrompt: FunctionComponent<ApiKeysEmptyPromptProps> = ({
  error,
  children,
}) => {
  const { services } = useKibana();

  if (error) {
    const { statusCode, message = '' } = (error as any).body ?? {};

    if (statusCode === 400 && message.indexOf('[feature_not_enabled_exception]') !== -1) {
      return (
        <EuiEmptyPrompt
          iconType="gear"
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.security.accountManagement.apiKeys.disabledErrorMessage"
                  defaultMessage="API keys are disabled."
                />
              </p>
              <p>
                <EuiLink
                  href={`${services.docLinks?.ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${services.docLinks?.DOC_LINK_VERSION}/security-settings.html#api-key-service-settings`}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.security.accountManagement.apiKeys.docsLinkText"
                    defaultMessage="Learn how to enable API keys."
                  />
                </EuiLink>
              </p>
            </>
          }
        />
      );
    }

    if (statusCode === 403) {
      return (
        <EuiEmptyPrompt
          iconType="lock"
          body={
            <p>
              <FormattedMessage
                id="xpack.security.accountManagement.apiKeys.forbiddenErrorMessage"
                defaultMessage="Not authorized to manage API keys."
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

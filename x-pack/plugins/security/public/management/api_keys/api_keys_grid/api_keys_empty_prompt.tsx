/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiEmptyPrompt, EuiErrorBoundary, EuiSpacer, EuiText } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { DocLink } from '../../../components/doc_link';
import { useHtmlId } from '../../../components/use_html_id';

export interface ApiKeysEmptyPromptProps {
  error?: Error;
}

export const ApiKeysEmptyPrompt: FunctionComponent<ApiKeysEmptyPromptProps> = ({
  error,
  children,
}) => {
  const accordionId = useHtmlId('apiKeysEmptyPrompt', 'accordion');

  if (error) {
    if (doesErrorIndicateAPIKeysAreDisabled(error)) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.security.management.apiKeysEmptyPrompt.disabledErrorMessage"
                  defaultMessage="API keys are disabled."
                />
              </p>
              <p>
                <DocLink app="elasticsearch" doc="security-settings.html#api-key-service-settings">
                  <FormattedMessage
                    id="xpack.security.management.apiKeysEmptyPrompt.docsLinkText"
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
                id="xpack.security.management.apiKeysEmptyPrompt.forbiddenErrorMessage"
                defaultMessage="Not authorized to manage API keys."
              />
            </p>
          }
        />
      );
    }

    const ThrowError = () => {
      throw error;
    };

    return (
      <EuiEmptyPrompt
        iconType="alert"
        body={
          <p>
            <FormattedMessage
              id="xpack.security.management.apiKeysEmptyPrompt.errorMessage"
              defaultMessage="Could not load API keys."
            />
          </p>
        }
        actions={
          <>
            {children}

            <EuiSpacer size="xl" />
            <EuiAccordion
              id={accordionId}
              buttonClassName="euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--xSmall"
              buttonContent={
                <FormattedMessage
                  id="xpack.security.management.apiKeysEmptyPrompt.technicalDetailsButton"
                  defaultMessage="Technical details"
                />
              }
              buttonProps={{
                style: { display: 'flex', justifyContent: 'center' },
              }}
              arrowDisplay="right"
              paddingSize="m"
            >
              <EuiText textAlign="left">
                <EuiErrorBoundary>
                  <ThrowError />
                </EuiErrorBoundary>
              </EuiText>
            </EuiAccordion>
          </>
        }
      />
    );
  }

  return (
    <EuiEmptyPrompt
      iconType="gear"
      title={
        <h1>
          <FormattedMessage
            id="xpack.security.management.apiKeysEmptyPrompt.emptyTitle"
            defaultMessage="Create your first API key"
          />
        </h1>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.security.management.apiKeysEmptyPrompt.emptyMessage"
            defaultMessage="Allow applications to access Elastic on your behalf."
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

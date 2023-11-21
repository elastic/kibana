/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiErrorBoundary, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { FunctionComponent } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { DocLink } from '../../../components/doc_link';
import { useHtmlId } from '../../../components/use_html_id';

export interface ApiKeysEmptyPromptProps {
  error?: Error;
  readOnly?: boolean;
}

export const ApiKeysEmptyPrompt: FunctionComponent<ApiKeysEmptyPromptProps> = ({
  error,
  readOnly,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useHtmlId('apiKeysEmptyPrompt', 'accordion');

  if (error) {
    if (doesErrorIndicateAPIKeysAreDisabled(error)) {
      return (
        <KibanaPageTemplate.EmptyPrompt
          iconType="warning"
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
        <KibanaPageTemplate.EmptyPrompt
          iconType="lock"
          body={
            <p>
              <FormattedMessage
                id="xpack.security.management.apiKeysEmptyPrompt.forbiddenErrorMessage"
                defaultMessage="You do not have permission to manage API keys."
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
      <KibanaPageTemplate.EmptyPrompt
        iconType="warning"
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
              buttonClassName={css({
                display: 'flex',
                justifyContent: 'center',
              })}
              buttonContent={
                <EuiText size="xs" className={css({ fontWeight: euiTheme.font.weight.medium })}>
                  <FormattedMessage
                    id="xpack.security.management.apiKeysEmptyPrompt.technicalDetailsButton"
                    defaultMessage="Technical details"
                  />
                </EuiText>
              }
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

  if (readOnly) {
    return (
      <KibanaPageTemplate.EmptyPrompt
        iconType="error"
        title={
          <h1>
            <FormattedMessage
              id="xpack.security.management.apiKeysEmptyPrompt.readOnlyEmptyTitle"
              defaultMessage="You do not have permission to create API keys"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.security.management.apiKeysEmptyPrompt.readOnlyEmptyMessage"
              defaultMessage="Please contact your administrator for more information"
            />
          </p>
        }
      />
    );
  }

  return (
    <KibanaPageTemplate.EmptyPrompt
      iconType="managementApp"
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
            defaultMessage="Allow external services to access the Elastic Stack on your behalf."
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import type { MouseEvent } from 'react';
import React from 'react';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import { APIReturnType } from '../../../services/rest/create_call_api';
import { PopoverTooltip } from '../../shared/popover_tooltip';

type ApiKeyPayload =
  APIReturnType<'POST /internal/observability_onboarding/logs/system/integration'>;

export function SystemIntegrationBanner({
  status,
  payload,
  error,
}: {
  status: FETCH_STATUS;
  payload?: ApiKeyPayload;
  error?: IHttpFetchError<ResponseErrorBody>;
}) {
  const { navigateToAppUrl } = useKibanaNavigation();

  const loadingCallout = (
    <EuiCallOut
      title={
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate(
              'xpack.observability_onboarding.systemIntegration.installing',
              {
                defaultMessage: 'Installing system integration',
              }
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      color="primary"
    />
  );

  const installedCallout = (
    <EuiFlexItem>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.observability_onboarding.systemIntegration.installed"
            defaultMessage="System integration installed. {systemIntegrationTooltip}"
            values={{
              systemIntegrationTooltip: (
                <PopoverTooltip>
                  <EuiFlexGroup direction="column" gutterSize="xs">
                    <EuiFlexItem>
                      {i18n.translate(
                        'xpack.observability_onboarding.systemIntegration.installed.tooltip.description',
                        {
                          defaultMessage:
                            'Integrations streamline connecting your data to the Elastic Stack.',
                        }
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <FormattedMessage
                        id="xpack.observability_onboarding.systemIntegration.installed.tooltip.link"
                        defaultMessage="{learnMoreLink} about the data you can collect using the Systems integration."
                        values={{
                          learnMoreLink: (
                            <EuiLink
                              data-test-subj="observabilityOnboardingSystemIntegrationLearnMore"
                              target="_blank"
                              style={{ marginRight: '3px' }}
                              onClick={(event: MouseEvent) => {
                                event.preventDefault();
                                navigateToAppUrl(
                                  `/integrations/detail/${payload?.name}-${payload?.version}`
                                );
                              }}
                            >
                              {i18n.translate(
                                'xpack.observability_onboarding.systemIntegration.installed.tooltip.link.label',
                                {
                                  defaultMessage: 'Learn more',
                                }
                              )}
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </PopoverTooltip>
              ),
            }}
          />
        }
        color="success"
        iconType="check"
      />
    </EuiFlexItem>
  );

  const errorCallout = (
    <EuiFlexItem>
      <EuiCallOut
        title={i18n.translate(
          'xpack.observability_onboarding.systemIntegration.status.failed',
          {
            defaultMessage: 'System integration installation failed',
          }
        )}
        color="danger"
        iconType="warning"
      >
        {i18n.translate(
          'xpack.observability_onboarding.systemIntegration.status.failed.description',
          {
            defaultMessage:
              'We had a problem installing the system integration.',
          }
        )}
      </EuiCallOut>
    </EuiFlexItem>
  );

  const noPrivilegesCallout = (
    <EuiFlexItem>
      <EuiCallOut
        title={i18n.translate(
          'xpack.observability_onboarding.systemIntegration.noPrivileges',
          {
            defaultMessage:
              'User does not have permissions to install system integration.',
          }
        )}
        color="warning"
        iconType="warning"
      >
        <p>
          {i18n.translate(
            'xpack.observability_onboarding.systemIntegration.noPrivileges.description',
            {
              defaultMessage:
                'Required kibana privileges are {requiredKibanaPrivileges}, please add all required privileges to the role of the authenticated user.',
              values: {
                requiredKibanaPrivileges: "['Integrations', 'Fleet']",
              },
            }
          )}
        </p>
      </EuiCallOut>
    </EuiFlexItem>
  );

  if (
    status === FETCH_STATUS.FAILURE &&
    error?.body?.message.includes('permissions')
  ) {
    return noPrivilegesCallout;
  }

  if (status === FETCH_STATUS.FAILURE) {
    return errorCallout;
  }

  if (status === FETCH_STATUS.LOADING) {
    return loadingCallout;
  }

  if (status === FETCH_STATUS.SUCCESS && payload?.version) {
    return installedCallout;
  }

  return null;
}

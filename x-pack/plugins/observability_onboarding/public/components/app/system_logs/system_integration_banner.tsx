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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  SystemIntegrationError,
  useInstallSystemIntegration,
} from '../../../hooks/use_install_system_integration';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import { PopoverTooltip } from '../../shared/popover_tooltip';

export function SystemIntegrationBanner() {
  const { navigateToAppUrl } = useKibanaNavigation();
  const [integrationVersion, setIntegrationVersion] = useState<string>();
  const [error, setError] = useState<SystemIntegrationError>();

  const onIntegrationCreationSuccess = useCallback(
    ({ version }: { version?: string }) => {
      setIntegrationVersion(version);
    },
    []
  );

  const onIntegrationCreationFailure = useCallback(
    (e: SystemIntegrationError) => {
      setError(e);
    },
    []
  );

  const { createIntegration, createIntegrationRequest } =
    useInstallSystemIntegration({
      onIntegrationCreationSuccess,
      onIntegrationCreationFailure,
    });

  useEffect(() => {
    createIntegration();
  }, [createIntegration]);

  const isInstallingIntegration = createIntegrationRequest.state === 'pending';
  const hasFailedInstallingIntegration =
    createIntegrationRequest.state === 'rejected';
  const hasInstalledIntegration = createIntegrationRequest.state === 'resolved';

  if (isInstallingIntegration) {
    return (
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
  }
  if (hasFailedInstallingIntegration) {
    return (
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate(
            'xpack.observability_onboarding.systemIntegration.status.failed',
            {
              defaultMessage: 'System integration installation failed',
            }
          )}
          color="warning"
          iconType="warning"
        >
          {error?.message}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  if (hasInstalledIntegration) {
    return (
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
                                    `/integrations/detail/system-${integrationVersion}`
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
  }
  return null;
}

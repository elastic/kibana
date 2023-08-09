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
import React, { useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import { useSystemIntegrationInstall } from '../../../hooks/use_system_integration_install';
import { useSystemIntegrationStatus } from '../../../hooks/use_system_integration_status';
import { PopoverTooltip } from '../../shared/popover_tooltip';

export function SystemIntegrationBanner() {
  const { navigateToAppUrl } = useKibanaNavigation();
  const { status: systemIntegrationStatus, data: systemIntegrationData } =
    useSystemIntegrationStatus();
  const systemIntegrationInstaller = useSystemIntegrationInstall();

  useEffect(() => {
    if (systemIntegrationData?.status === 'not_installed') {
      systemIntegrationInstaller.mutate(systemIntegrationData?.version);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemIntegrationData]);

  if (systemIntegrationStatus === 'loading') {
    return (
      <EuiCallOut
        title={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate(
                'xpack.observability_onboarding.systemIntegration.status.loading',
                {
                  defaultMessage: 'Checking System integration',
                }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        color="primary"
      />
    );
  }
  if (systemIntegrationStatus === 'error') {
    return (
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate(
            'xpack.observability_onboarding.systemIntegration.status.failed',
            {
              defaultMessage: 'System integration check failed',
            }
          )}
          color="danger"
          iconType="warning"
        >
          {i18n.translate(
            'xpack.observability_onboarding.systemIntegration.status.failed.description',
            {
              defaultMessage:
                'We had a problem checking the system integration status.',
            }
          )}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  if (
    systemIntegrationData?.status === 'installing' ||
    systemIntegrationData?.status === 'not_installed'
  ) {
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
  if (systemIntegrationData?.status === 'installed') {
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
                                    `/integrations/detail/system-${systemIntegrationData?.version}`
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

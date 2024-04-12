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
import { PopoverTooltip } from '../shared/popover_tooltip';

export type SystemIntegrationBannerState = 'pending' | 'resolved' | 'rejected';

export function SystemIntegrationBanner({
  onStatusChange,
}: {
  onStatusChange: (status: SystemIntegrationBannerState) => void;
}) {
  const { navigateToAppUrl } = useKibanaNavigation();
  const [integrationVersion, setIntegrationVersion] = useState<string>();
  const [error, setError] = useState<SystemIntegrationError>();

  const onIntegrationCreationSuccess = useCallback(
    ({ version }: { version?: string }) => {
      setIntegrationVersion(version);
      onStatusChange('resolved');
    },
    [onStatusChange]
  );

  const onIntegrationCreationFailure = useCallback(
    (e: SystemIntegrationError) => {
      setError(e);
      onStatusChange('rejected');
    },
    [onStatusChange]
  );

  const { performRequest, requestState } = useInstallSystemIntegration({
    onIntegrationCreationSuccess,
    onIntegrationCreationFailure,
  });

  useEffect(() => {
    performRequest();
  }, [performRequest]);

  const isInstallingIntegration = requestState.state === 'pending';
  const hasFailedInstallingIntegration = requestState.state === 'rejected';
  const hasInstalledIntegration = requestState.state === 'resolved';

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
        data-test-subj="obltOnboardingSystemLogsInstallingIntegration"
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
          data-test-subj="obltOnboardingSystemLogsIntegrationInstallationFailed"
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
                  <PopoverTooltip
                    dataTestSubj="obltOnboardingSystemLogsIntegrationInfo"
                    ariaLabel={i18n.translate(
                      'xpack.observability_onboarding.systemIntegration.installed.tooltip.label',
                      {
                        defaultMessage: 'Integration details',
                      }
                    )}
                  >
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
          data-test-subj="obltOnboardingSystemLogsIntegrationInstalled"
        />
      </EuiFlexItem>
    );
  }
  return null;
}

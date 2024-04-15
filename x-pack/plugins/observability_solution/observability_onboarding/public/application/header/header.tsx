/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React from 'react';
import {
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { CoreStart } from '@kbn/core/public';

export const Header = () => {
  const { services } = useKibana<CoreStart>();

  const currentUser = useAsync(services.security.authc.getCurrentUser);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSkeletonTitle
          size="xs"
          isLoading={currentUser.loading}
          announceLoadingStatus={false}
          announceLoadedStatus={false}
        >
          {currentUser.value && (
            <EuiTitle size="xs">
              <strong>
                <EuiTextColor color="subdued">
                  {i18n.translate(
                    'xpack.observability_onboarding.experimentalOnboardingFlow.h1.hiJohnLabel',
                    {
                      defaultMessage: 'Hi {username}!',
                      values: {
                        username:
                          currentUser.value.full_name ??
                          currentUser.value.username,
                      },
                    }
                  )}
                </EuiTextColor>
              </strong>
            </EuiTitle>
          )}
        </EuiSkeletonTitle>
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h1>
            {i18n.translate(
              'xpack.observability_onboarding.experimentalOnboardingFlow.addObservabilityDataTitleLabel',
              { defaultMessage: 'Add Observability data' }
            )}
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          {i18n.translate(
            'xpack.observability_onboarding.experimentalOnboardingFlow.startIngestingDataIntoTextLabel',
            {
              defaultMessage:
                'Start ingesting data into your Observability project. Return to this page at any time by clicking Add data.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem />
    </EuiFlexGroup>
  );
};

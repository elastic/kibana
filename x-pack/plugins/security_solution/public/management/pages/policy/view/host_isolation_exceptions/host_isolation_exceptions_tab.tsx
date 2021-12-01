/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiLink,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { APP_UI_ID } from '../../../../../../common/constants';
import { useAppUrl } from '../../../../../common/lib/kibana';
import { getHostIsolationExceptionsListPath } from '../../../../common/routing';
import { policyDetails } from '../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { PolicyHostIsolationExceptionsEmptyUnassigned } from './components/empty_unassigned';

export const PolicyHostIsolationExceptionsTab = () => {
  const { getAppUrl } = useAppUrl();
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const displaysEmptyState = true;
  return policyItem ? (
    <div>
      <EuiPageHeader alignItems="center">
        <EuiPageHeaderSection>
          <EuiTitle size="m">
            <h2>
              {i18n.translate(
                'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.title',
                {
                  defaultMessage: 'Assigned host isolation exceptions',
                }
              )}
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText size="xs">
            <p>
              <EuiLink
                href={getAppUrl({ appId: APP_UI_ID, path: getHostIsolationExceptionsListPath() })}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.subtitle"
                  defaultMessage="view all host isolation exceptions"
                />
              </EuiLink>
            </p>
          </EuiText>
        </EuiPageHeaderSection>
      </EuiPageHeader>

      <EuiSpacer size="l" />
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        {displaysEmptyState ? (
          <PolicyHostIsolationExceptionsEmptyUnassigned policyName={policyItem.name} />
        ) : (
          <EuiProgress size="xs" color="primary" />
        )}
      </EuiPageContent>
    </div>
  ) : null;
};
PolicyHostIsolationExceptionsTab.displayName = 'PolicyHostIsolationExceptionsTab';

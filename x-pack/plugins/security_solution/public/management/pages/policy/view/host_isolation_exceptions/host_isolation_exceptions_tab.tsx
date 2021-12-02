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
import React, { useMemo } from 'react';
import { APP_UI_ID } from '../../../../../../common/constants';
import { PolicyData } from '../../../../../../common/endpoint/types';
import { useAppUrl } from '../../../../../common/lib/kibana';
import { getHostIsolationExceptionsListPath } from '../../../../common/routing';
import { useFetchHostIsolationExceptionsList } from '../../../host_isolation_exceptions/view/hooks';
import { getCurrentArtifactsLocation } from '../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { PolicyHostIsolationExceptionsEmptyUnassigned } from './components/empty_unassigned';
import { PolicyHostIsolationExceptionsList } from './components/list';

export const PolicyHostIsolationExceptionsTab = ({
  policyId,
  policy,
}: {
  policyId: string;
  policy: PolicyData;
}) => {
  const { getAppUrl } = useAppUrl();

  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  const policyExceptionsListRequest = useFetchHostIsolationExceptionsList({
    filter: location.filter,
    page: location.page_index,
    perPage: location.page_size,
    policies: [policyId],
  });

  // TODO hasNoDefinedExceptions
  const hasNoAssignedPolicies = policyExceptionsListRequest.data?.total === 0;

  const subTitle = useMemo(() => {
    const link = (
      <EuiLink
        href={getAppUrl({ appId: APP_UI_ID, path: getHostIsolationExceptionsListPath() })}
        target="_blank"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.viewAllLinkLabel"
          defaultMessage="view all host isolation exceptions"
        />
      </EuiLink>
    );

    return policyExceptionsListRequest.data ? (
      <FormattedMessage
        id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.about"
        defaultMessage="There {count, plural, one {is} other {are}} {count} {count, plural, =1 {exception} other {exceptions}} associated with this policy. Click here to {link}"
        values={{
          count: policyExceptionsListRequest.data?.total,
          link,
        }}
      />
    ) : null;
  }, [policyExceptionsListRequest.data, getAppUrl]);

  return !policyExceptionsListRequest.isLoading && policyExceptionsListRequest.data && policy ? (
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
            <p>{subTitle}</p>
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
        {hasNoAssignedPolicies ? (
          <PolicyHostIsolationExceptionsEmptyUnassigned policyName={policy.name} />
        ) : (
          <PolicyHostIsolationExceptionsList exceptions={policyExceptionsListRequest.data} />
        )}
      </EuiPageContent>
    </div>
  ) : (
    <EuiProgress size="xs" color="primary" />
  );
};
PolicyHostIsolationExceptionsTab.displayName = 'PolicyHostIsolationExceptionsTab';

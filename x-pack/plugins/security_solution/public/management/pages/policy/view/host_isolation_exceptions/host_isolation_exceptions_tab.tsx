/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiLink,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { APP_UI_ID } from '../../../../../../common/constants';
import { PolicyData } from '../../../../../../common/endpoint/types';
import { useAppUrl } from '../../../../../common/lib/kibana';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../../common/constants';
import {
  getHostIsolationExceptionsListPath,
  getPolicyHostIsolationExceptionsPath,
} from '../../../../common/routing';
import { ManagementPageLoader } from '../../../../components/management_page_loader';
import { useFetchHostIsolationExceptionsList } from '../../../host_isolation_exceptions/view/hooks';
import { getCurrentArtifactsLocation } from '../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { PolicyHostIsolationExceptionsAssignFlyout } from './components/assign_flyout';
import { PolicyHostIsolationExceptionsEmptyUnassigned } from './components/empty_unassigned';
import { PolicyHostIsolationExceptionsEmptyUnexisting } from './components/empty_unexisting';
import { PolicyHostIsolationExceptionsList } from './components/list';

export const PolicyHostIsolationExceptionsTab = ({ policy }: { policy: PolicyData }) => {
  const { getAppUrl } = useAppUrl();
  const privileges = useUserPrivileges().endpointPrivileges;

  const policyId = policy.id;

  const history = useHistory();
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  const toHostIsolationList = getAppUrl({
    appId: APP_UI_ID,
    path: getHostIsolationExceptionsListPath(),
  });

  const allPolicyExceptionsListRequest = useFetchHostIsolationExceptionsList({
    page: MANAGEMENT_DEFAULT_PAGE,
    perPage: MANAGEMENT_DEFAULT_PAGE_SIZE,
    policies: [policyId, 'all'],
  });

  const policySearchedExceptionsListRequest = useFetchHostIsolationExceptionsList({
    filter: location.filter,
    page: location.page_index,
    perPage: location.page_size,
    policies: [policyId, 'all'],
  });

  const allExceptionsListRequest = useFetchHostIsolationExceptionsList({
    page: MANAGEMENT_DEFAULT_PAGE,
    perPage: MANAGEMENT_DEFAULT_PAGE_SIZE,
    // only do this request if no assigned policies found
    enabled: allPolicyExceptionsListRequest.data?.total === 0,
  });

  const hasNoAssignedOrExistingExceptions = allPolicyExceptionsListRequest.data?.total === 0;
  const hasNoExistingExceptions = allExceptionsListRequest.data?.total === 0;

  const subTitle = useMemo(() => {
    const link = (
      <EuiLink href={getAppUrl({ appId: APP_UI_ID, path: toHostIsolationList })} target="_blank">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.viewAllLinkLabel"
          defaultMessage="view all host isolation exceptions"
        />
      </EuiLink>
    );

    return policySearchedExceptionsListRequest.data ? (
      <FormattedMessage
        id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.about"
        defaultMessage="There {count, plural, one {is} other {are}} {count} {count, plural, =1 {host isolation exception} other {host isolation exceptions}} associated with this policy. Click here to {link}"
        values={{
          count: allPolicyExceptionsListRequest.data?.total,
          link,
        }}
      />
    ) : null;
  }, [
    allPolicyExceptionsListRequest.data?.total,
    getAppUrl,
    policySearchedExceptionsListRequest.data,
    toHostIsolationList,
  ]);

  const handleAssignButton = () => {
    history.push(
      getPolicyHostIsolationExceptionsPath(policyId, {
        ...location,
        show: 'list',
      })
    );
  };

  const handleFlyoutOnClose = () => {
    history.push(
      getPolicyHostIsolationExceptionsPath(policyId, {
        ...location,
        show: undefined,
      })
    );
  };

  const assignFlyout =
    location.show === 'list' ? (
      <PolicyHostIsolationExceptionsAssignFlyout policy={policy} onClose={handleFlyoutOnClose} />
    ) : null;

  const isLoading =
    policySearchedExceptionsListRequest.isLoading ||
    allPolicyExceptionsListRequest.isLoading ||
    allExceptionsListRequest.isLoading ||
    !policy;

  // render non-existent or non-assigned messages
  if (!isLoading && (hasNoAssignedOrExistingExceptions || hasNoExistingExceptions)) {
    if (hasNoExistingExceptions) {
      return (
        <PolicyHostIsolationExceptionsEmptyUnexisting toHostIsolationList={toHostIsolationList} />
      );
    } else {
      return (
        <>
          {assignFlyout}
          <PolicyHostIsolationExceptionsEmptyUnassigned
            policy={policy}
            toHostIsolationList={toHostIsolationList}
          />
        </>
      );
    }
  }

  // render header and list
  return !isLoading && policySearchedExceptionsListRequest.data ? (
    <div data-test-subj={'policyHostIsolationExceptionsTab'}>
      {assignFlyout}
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

          <EuiText size="xs" data-test-subj="policyHostIsolationExceptionsTabSubtitle">
            <p>{subTitle}</p>
          </EuiText>
        </EuiPageHeaderSection>
        {privileges.canIsolateHost ? (
          <EuiPageHeaderSection>
            <EuiButton
              fill
              iconType="plusInCircle"
              data-test-subj="hostIsolationExceptions-assign-button"
              onClick={handleAssignButton}
            >
              {i18n.translate(
                'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.assignToPolicy',
                {
                  defaultMessage: 'Assign host isolation exceptions to policy',
                }
              )}
            </EuiButton>
          </EuiPageHeaderSection>
        ) : null}
      </EuiPageHeader>

      <EuiSpacer size="l" />
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        <PolicyHostIsolationExceptionsList
          exceptions={policySearchedExceptionsListRequest.data}
          policyId={policyId}
        />
      </EuiPageContent>
    </div>
  ) : (
    <ManagementPageLoader data-test-subj="policyHostIsolationExceptionsTabLoading" />
  );
};
PolicyHostIsolationExceptionsTab.displayName = 'PolicyHostIsolationExceptionsTab';

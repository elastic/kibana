/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPageTemplate_Deprecated as EuiPageTemplate,
} from '@elastic/eui';
import { usePolicyDetailsSelector } from './policy_hooks';
import { policyDetails, agentStatusSummary, apiError } from '../store/policy_details/selectors';
import { AgentsSummary } from './agents_summary';
import { PolicyTabs } from './tabs';
import { AdministrationListPage } from '../../../components/administration_list_page';
import type { BackToExternalAppButtonProps } from '../../../components/back_to_external_app_button/back_to_external_app_button';
import { BackToExternalAppButton } from '../../../components/back_to_external_app_button/back_to_external_app_button';
import type { PolicyDetailsRouteState } from '../../../../../common/endpoint/types';
import { getEndpointListPath, getPoliciesPath } from '../../../common/routing';
import { useAppUrl } from '../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

export const PolicyDetails = React.memo(() => {
  const isPolicyListEnabled = useIsExperimentalFeatureEnabled('policyListEnabled');
  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();
  const { getAppUrl } = useAppUrl();

  // Store values
  const policyApiError = usePolicyDetailsSelector(apiError);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);

  // Local state
  const policyName = policyItem?.name ?? '';
  const policyDescription = policyItem?.description ?? undefined;

  const backLinkOptions = useMemo<BackToExternalAppButtonProps>(() => {
    if (routeState?.backLink) {
      return {
        onBackButtonNavigateTo: routeState.backLink.navigateTo,
        backButtonLabel: routeState.backLink.label,
        backButtonUrl: routeState.backLink.href,
      };
    }

    if (isPolicyListEnabled) {
      // default is to go back to the policy list
      const policyListPath = getPoliciesPath();
      return {
        backButtonLabel: i18n.translate('xpack.securitySolution.policyDetails.backToPolicyButton', {
          defaultMessage: 'Back to policy list',
        }),
        backButtonUrl: getAppUrl({ path: policyListPath }),
        onBackButtonNavigateTo: [
          APP_UI_ID,
          {
            path: policyListPath,
          },
        ],
      };
    } else {
      // remove else block once policy list is not hidden behind feature flag
      const endpointListPath = getEndpointListPath({ name: 'endpointList' });
      return {
        backButtonLabel: i18n.translate('xpack.securitySolution.policyDetails.backToEndpointList', {
          defaultMessage: 'View all endpoints',
        }),
        backButtonUrl: getAppUrl({ path: endpointListPath }),
        onBackButtonNavigateTo: [
          APP_UI_ID,
          {
            path: endpointListPath,
          },
        ],
      };
    }
  }, [getAppUrl, routeState?.backLink, isPolicyListEnabled]);

  const headerRightContent = (
    <AgentsSummary
      total={policyAgentStatusSummary?.total ?? 0}
      online={policyAgentStatusSummary?.online ?? 0}
      offline={policyAgentStatusSummary?.offline ?? 0}
      error={policyAgentStatusSummary?.error ?? 0}
    />
  );

  const backToEndpointList = (
    <BackToExternalAppButton {...backLinkOptions} data-test-subj="policyDetailsBackLink" />
  );

  const pageBody: React.ReactNode = useMemo(() => {
    if (policyApiError) {
      return (
        <EuiPageTemplate template="centeredContent">
          <EuiCallOut color="danger" title={policyApiError?.error}>
            <span data-test-subj="policyDetailsIdNotFoundMessage">{policyApiError?.message}</span>
          </EuiCallOut>
        </EuiPageTemplate>
      );
    }

    if (!policyItem) {
      return (
        <EuiPageTemplate template="centeredContent">
          <EuiLoadingSpinner
            className="essentialAnimation"
            size="xl"
            data-test-subj="policyDetailsLoading"
          />
        </EuiPageTemplate>
      );
    }

    return <PolicyTabs />;
  }, [policyApiError, policyItem]);

  return (
    <AdministrationListPage
      data-test-subj="policyDetailsPage"
      title={policyName}
      subtitle={policyDescription}
      headerBackComponent={backToEndpointList}
      actions={policyApiError ? undefined : headerRightContent}
      restrictWidth={true}
      hasBottomBorder={false}
    >
      {pageBody}
    </AdministrationListPage>
  );
});

PolicyDetails.displayName = 'PolicyDetails';

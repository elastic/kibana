/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { usePolicyDetailsSelector } from './policy_hooks';
import { policyDetails, agentStatusSummary } from '../store/policy_details/selectors';
import { AgentsSummary } from './agents_summary';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { SecurityPageName } from '../../../../app/types';
import { HeaderLinkBack } from '../../../../common/components/header_page';
import { PolicyTabs } from './tabs';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { PolicyFormLayout } from './policy_forms/components';

export const PolicyDetails = React.memo(() => {
  // TODO: Remove this and related code when removing FF
  const isTrustedAppsByPolicyEnabled = useIsExperimentalFeatureEnabled(
    'trustedAppsByPolicyEnabled'
  );

  // Store values
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);

  // Local state
  const policyName = policyItem?.name ?? '';
  const policyDescription = policyItem?.description ?? undefined;

  const headerRightContent = (
    <AgentsSummary
      total={policyAgentStatusSummary?.total ?? 0}
      online={policyAgentStatusSummary?.online ?? 0}
      offline={policyAgentStatusSummary?.offline ?? 0}
      error={policyAgentStatusSummary?.error ?? 0}
    />
  );

  const backToEndpointList = (
    <HeaderLinkBack
      backOptions={{
        text: i18n.translate('xpack.securitySolution.endpoint.policy.details.backToListTitle', {
          defaultMessage: 'Back to endpoint hosts',
        }),
        pageId: SecurityPageName.endpoints,
        dataTestSubj: 'policyDetailsBackLink',
      }}
    />
  );

  return (
    <AdministrationListPage
      data-test-subj="policyDetailsPage"
      title={policyName}
      subtitle={policyDescription}
      headerBackComponent={backToEndpointList}
      actions={headerRightContent}
      restrictWidth={true}
      hasBottomBorder={!isTrustedAppsByPolicyEnabled} // TODO: Remove this and related code when removing FF
    >
      {isTrustedAppsByPolicyEnabled ? (
        <PolicyTabs />
      ) : (
        // TODO: Remove this and related code when removing FF
        <PolicyFormLayout />
      )}
    </AdministrationListPage>
  );
});

PolicyDetails.displayName = 'PolicyDetails';

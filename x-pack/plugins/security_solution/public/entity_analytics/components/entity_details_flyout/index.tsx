/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { PREFIX } from '../../../flyout/shared/test_ids';
import type { RiskInputsTabProps } from './tabs/risk_inputs/risk_inputs_tab';
import { RiskInputsTab } from './tabs/risk_inputs/risk_inputs_tab';
import { InsightsTabCsp } from '../../../cloud_security_posture/components/csp_details/insights_tab_csp';

export const RISK_INPUTS_TAB_TEST_ID = `${PREFIX}RiskInputsTab` as const;
export const INSIGHTS_TAB_TEST_ID = `${PREFIX}InsightInputsTab` as const;

export const getRiskInputTab = ({ entityType, entityName, scopeId }: RiskInputsTabProps) => ({
  id: EntityDetailsLeftPanelTab.RISK_INPUTS,
  'data-test-subj': RISK_INPUTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.riskInputs.tabLabel"
      defaultMessage="Risk contributions"
    />
  ),
  content: <RiskInputsTab entityType={entityType} entityName={entityName} scopeId={scopeId} />,
});

export const getInsightsInputTab = ({
  name,
  fieldName,
}: {
  name: string;
  fieldName: 'host.name' | 'user.name';
}) => ({
  id: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
  'data-test-subj': INSIGHTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.insightsDetails.insights.tabLabel"
      defaultMessage="Insights"
    />
  ),
  content: <InsightsTabCsp name={name} fieldName={fieldName} />,
});

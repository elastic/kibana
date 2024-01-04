/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { UserDetailsLeftPanelTab } from '../../../flyout/entity_details/user_details_left/tabs';
import { RiskInputsTab } from './tabs/risk_inputs';

export const RISK_INPUTS_TAB_TEST_ID = `${PREFIX}RiskInputsTab` as const;

export const getRiskInputTab = (alertIds: string[]) => ({
  id: UserDetailsLeftPanelTab.RISK_INPUTS,
  'data-test-subj': RISK_INPUTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.riskInputs.tabLabel"
      defaultMessage="Risk Inputs"
    />
  ),
  content: <RiskInputsTab alertIds={alertIds} />,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiButton, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import * as i18n from '../translations';
import { useRiskEningeStatus } from '../api/hooks/use_risk_engine_status';
import { RiskEngineStatus } from '../../../common/risk_engine/types';
import { SecuritySolutionLinkButton } from '../../common/components/links';
import { SecurityPageName } from '../../../common/constants';

export const RiskScoreUpdatePanel = () => {
  const { data: riskEnginesStatus } = useRiskEningeStatus();
  const isUpdateAvailable =
    riskEnginesStatus?.legacy_risk_engine_status === RiskEngineStatus.ENABLED;

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <EuiCallOut title={i18n.UPDATE_PANEL_TITLE} color="primary" iconType="starEmpty">
      <EuiText>{i18n.UPDATE_PANEL_MESSAGE}</EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <SecuritySolutionLinkButton
          color="primary"
          fill
          deepLinkId={SecurityPageName.entityAnalyticsManagement}
        >
          {i18n.UPDATE_PANEL_GO_TO_MANAGE}
        </SecuritySolutionLinkButton>
        <EuiButton>{i18n.UPDATE_PANEL_GO_TO_DISMISS}</EuiButton>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

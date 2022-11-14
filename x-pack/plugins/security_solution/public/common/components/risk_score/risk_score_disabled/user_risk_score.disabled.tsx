/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useCheckSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import { RiskScoreHeaderTitle } from '../risk_score_onboarding/risk_score_header_title';
import type { inputsModel } from '../../../store';
import { HeaderSection } from '../../header_section';
import { RiskScoreDocLink } from '../risk_score_onboarding/risk_score_doc_link';
import { RiskScoreEnableButton } from '../risk_score_onboarding/risk_score_enable_button';
import * as i18n from './translations';

const EntityAnalyticsUserRiskScoreDisableComponent = ({
  refetch,
  timerange,
}: {
  refetch: inputsModel.Refetch;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const { signalIndexExists } = useCheckSignalIndex();

  return (
    <EuiPanel hasBorder>
      <HeaderSection
        title={<RiskScoreHeaderTitle riskScoreEntity={RiskScoreEntity.user} />}
        titleSize="s"
      />
      <EuiEmptyPrompt
        title={<h2>{i18n.ENABLE_USER_RISK_SCORE}</h2>}
        body={
          <>
            {i18n.ENABLE_USER_RISK_SCORE_DESCRIPTION}{' '}
            <RiskScoreDocLink riskScoreEntity={RiskScoreEntity.user} />
          </>
        }
        actions={
          <EuiToolTip content={!signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null}>
            <RiskScoreEnableButton
              disabled={!signalIndexExists}
              refetch={refetch}
              riskScoreEntity={RiskScoreEntity.user}
              timerange={timerange}
            />
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};

export const EntityAnalyticsUserRiskScoreDisable = React.memo(
  EntityAnalyticsUserRiskScoreDisableComponent
);
EntityAnalyticsUserRiskScoreDisable.displayName = 'EntityAnalyticsUserRiskScoreDisable';

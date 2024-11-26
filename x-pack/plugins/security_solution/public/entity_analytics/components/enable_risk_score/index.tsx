/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React from 'react';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { useCheckSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import type { inputsModel } from '../../../common/store';
import { HeaderSection } from '../../../common/components/header_section';
import * as i18n from './translations';
import { EntityAnalyticsLearnMoreLink } from '../entity_analytics_learn_more_link';
import { RiskScoreHeaderTitle } from '../risk_score_header_title';
import { RiskScoreEnableButton } from '../risk_score_enable_button';

const EnableRiskScoreComponent = ({
  isDisabled,
  entityType,
  refetch,
  timerange,
}: {
  isDisabled: boolean;
  entityType: RiskScoreEntity;
  refetch: inputsModel.Refetch;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const { signalIndexExists } = useCheckSignalIndex();
  if (!isDisabled) {
    return null;
  }

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={<RiskScoreHeaderTitle riskScoreEntity={entityType} />} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{i18n.ENABLE_RISK_SCORE(entityType)}</h2>}
        body={
          <>
            {i18n.ENABLE_RISK_SCORE_DESCRIPTION(entityType)}
            {` `}
            <EntityAnalyticsLearnMoreLink />
          </>
        }
        actions={
          <EuiToolTip content={!signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null}>
            <RiskScoreEnableButton
              disabled={!signalIndexExists}
              refetch={refetch}
              riskScoreEntity={entityType}
              timerange={timerange}
            />
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};

export const EnableRiskScore = React.memo(EnableRiskScoreComponent);
EnableRiskScore.displayName = 'EnableRiskScore';

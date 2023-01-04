/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { RiskScoreUpgradeButton } from '../risk_score_onboarding/risk_score_upgrade_button';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useCheckSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import type { inputsModel } from '../../../../common/store';
import { RiskScoreHeaderTitle } from '../risk_score_onboarding/risk_score_header_title';
import { HeaderSection } from '../../../../common/components/header_section';
import { RiskScoreDocLink } from '../risk_score_onboarding/risk_score_doc_link';
import { RiskScoreEnableButton } from '../risk_score_onboarding/risk_score_enable_button';
import * as i18n from './translations';

const EnableRiskScoreComponent = ({
  isDeprecated,
  isDisabled,
  entityType,
  refetch,
  timerange,
}: {
  isDeprecated: boolean;
  isDisabled: boolean;
  entityType: RiskScoreEntity;
  refetch: inputsModel.Refetch;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const { signalIndexExists } = useCheckSignalIndex();
  if (!isDeprecated && !isDisabled) {
    return null;
  }

  const text = isDeprecated
    ? {
        cta: i18n.UPGRADE_RISK_SCORE(entityType),
        body: i18n.UPGRADE_RISK_SCORE_DESCRIPTION,
      }
    : {
        cta: i18n.ENABLE_RISK_SCORE(entityType),
        body: i18n.ENABLE_RISK_SCORE_DESCRIPTION(entityType),
      };

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={<RiskScoreHeaderTitle riskScoreEntity={entityType} />} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{text.cta}</h2>}
        body={
          <>
            {text.body}
            {` `}
            <RiskScoreDocLink riskScoreEntity={entityType} />
          </>
        }
        actions={
          <EuiToolTip content={!signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null}>
            {isDeprecated ? (
              <RiskScoreUpgradeButton
                refetch={refetch}
                riskScoreEntity={entityType}
                disabled={!signalIndexExists}
                timerange={timerange}
                data-test-subj={`upgrade_${entityType}_risk_score`}
                title={text.cta}
              />
            ) : (
              <RiskScoreEnableButton
                disabled={!signalIndexExists}
                refetch={refetch}
                riskScoreEntity={entityType}
                timerange={timerange}
              />
            )}
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};

export const EnableRiskScore = React.memo(EnableRiskScoreComponent);
EnableRiskScore.displayName = 'EnableRiskScore';

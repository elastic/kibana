/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskScoreUpgradeButton } from '../risk_score_onboarding/risk_score_upgrade_button';
import { useCheckSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import type { inputsModel } from '../../../store';
import { HeaderSection } from '../../header_section';
import * as i18n from './translations';
import { RiskScoreHeaderTitle } from '../risk_score_onboarding/risk_score_header_title';

export const RiskScoresDeprecated = ({
  entityType,
  refetch,
  timerange,
}: {
  entityType: RiskScoreEntity;
  refetch: inputsModel.Refetch;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const { signalIndexExists } = useCheckSignalIndex();

  const translations = useMemo(
    () => ({
      body: i18n.UPGRADE_RISK_SCORE_DESCRIPTION,
      signal: !signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null,
      ...(entityType === RiskScoreEntity.host
        ? {
            cta: i18n.UPGRADE_HOST_RISK_SCORE,
          }
        : {
            cta: i18n.UPGRADE_USER_RISK_SCORE,
          }),
    }),
    [entityType, signalIndexExists]
  );

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={<RiskScoreHeaderTitle riskScoreEntity={entityType} />} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{translations.cta}</h2>}
        body={translations.body}
        actions={
          <EuiToolTip content={translations.signal}>
            <RiskScoreUpgradeButton
              refetch={refetch}
              riskScoreEntity={entityType}
              disabled={!signalIndexExists}
              timerange={timerange}
              data-test-subj={`upgrade_${entityType}_risk_score`}
              title={translations.cta}
            />
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};

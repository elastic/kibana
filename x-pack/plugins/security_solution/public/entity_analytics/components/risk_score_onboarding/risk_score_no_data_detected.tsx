/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RiskScoreEntity } from '../../../../common/search_strategy';

import { HeaderSection } from '../../../common/components/header_section';
import * as i18n from './translations';
import { RiskScoreHeaderTitle } from './risk_score_header_title';
import { RiskScoreRestartButton } from './risk_score_restart_button';
import type { inputsModel } from '../../../common/store';
import { useIsNewRiskScoreModuleInstalled } from '../../api/hooks/use_risk_engine_status';

const RiskScoresNoDataDetectedComponent = ({
  entityType,
  refetch,
}: {
  entityType: RiskScoreEntity;
  refetch: inputsModel.Refetch;
}) => {
  const isNewRiskScoreModuleInstalled = useIsNewRiskScoreModuleInstalled();

  const translations = useMemo(
    () => ({
      title:
        entityType === RiskScoreEntity.user ? i18n.USER_WARNING_TITLE : i18n.HOST_WARNING_TITLE,
      body: entityType === RiskScoreEntity.user ? i18n.USER_WARNING_BODY : i18n.HOST_WARNING_BODY,
    }),
    [entityType]
  );

  return (
    <EuiPanel data-test-subj={`${entityType}-risk-score-no-data-detected`} hasBorder>
      <HeaderSection title={<RiskScoreHeaderTitle riskScoreEntity={entityType} />} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{translations.title}</h2>}
        body={translations.body}
        actions={
          <>
            {!isNewRiskScoreModuleInstalled && (
              <EuiToolTip content={i18n.RESTART_TOOLTIP}>
                <RiskScoreRestartButton refetch={refetch} riskScoreEntity={entityType} />
              </EuiToolTip>
            )}
          </>
        }
      />
    </EuiPanel>
  );
};

export const RiskScoresNoDataDetected = React.memo(RiskScoresNoDataDetectedComponent);
RiskScoresNoDataDetected.displayName = 'RiskScoresNoDataDetected';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

import { HeaderSection } from '../../header_section';
import * as i18n from './translations';
import { RiskScoreHeaderTitle } from './risk_score_header_title';

const RiskScoresNoDataDetectedComponent = ({ entityType }: { entityType: RiskScoreEntity }) => {
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
      <EuiEmptyPrompt title={<h2>{translations.title}</h2>} body={translations.body} />
    </EuiPanel>
  );
};

export const RiskScoresNoDataDetected = React.memo(RiskScoresNoDataDetectedComponent);
RiskScoresNoDataDetected.displayName = 'RiskScoresNoDataDetected';

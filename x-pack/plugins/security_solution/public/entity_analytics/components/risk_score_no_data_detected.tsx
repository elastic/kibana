/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { RiskScoreEntity } from '../../../common/search_strategy';
import { RiskScoreHeaderTitle } from './risk_score_header_title';
import { HeaderSection } from '../../common/components/header_section';

const HOST_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.hostsDashboardWarningPanelTitle',
  {
    defaultMessage: 'No host risk score data available to display',
  }
);

const USER_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardWarningPanelTitle',
  {
    defaultMessage: 'No user risk score data available to display',
  }
);

const HOST_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.riskScore.hostsDashboardWarningPanelBody',
  {
    defaultMessage: `We haven’t found any host risk score data. Check if you have any global filters in the global KQL search bar. If you have just enabled the host risk module, the risk engine might need an hour to generate host risk score data and display in this panel.`,
  }
);

const USER_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardWarningPanelBody',
  {
    defaultMessage: `We haven’t found any user risk score data. Check if you have any global filters in the global KQL search bar. If you have just enabled the user risk module, the risk engine might need an hour to generate user risk score data and display in this panel.`,
  }
);

const RiskScoresNoDataDetectedComponent = ({ entityType }: { entityType: RiskScoreEntity }) => {
  const translations = useMemo(
    () => ({
      title: entityType === RiskScoreEntity.user ? USER_WARNING_TITLE : HOST_WARNING_TITLE,
      body: entityType === RiskScoreEntity.user ? USER_WARNING_BODY : HOST_WARNING_BODY,
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

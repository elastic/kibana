/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { HeaderSection } from '../../../common/components/header_section';
import * as i18n from './translations';
import { EntityAnalyticsLearnMoreLink } from '../entity_analytics_learn_more_link';
import { RiskScoreHeaderTitle } from '../risk_score_header_title';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { SecurityPageName } from '../../../../common/constants';

const EnableRiskScoreComponent = ({
  isDisabled,
  entityType,
}: {
  isDisabled: boolean;
  entityType: RiskScoreEntity;
}) => {
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
          <EuiToolTip content={i18n.ENABLE_RISK_SCORE_POPOVER}>
            <SecuritySolutionLinkButton
              color="primary"
              fill
              deepLinkId={SecurityPageName.entityAnalyticsManagement}
              data-test-subj={`enable_risk_score`}
            >
              <FormattedMessage
                id="xpack.securitySolution.riskScore.enableButtonTitle"
                defaultMessage="Enable"
              />
            </SecuritySolutionLinkButton>
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};

export const EnableRiskScore = React.memo(EnableRiskScoreComponent);
EnableRiskScore.displayName = 'EnableRiskScore';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { RISK_SCORE_TITLE_TEST_ID, RISK_SCORE_VALUE_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';

/**
 * Document details risk score displayed in flyout right section header
 */
export const RiskScore = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
  const fieldsData = getFieldsData(ALERT_RISK_SCORE);

  if (!fieldsData) {
    return null;
  }

  let alertRiskScore: string;
  if (typeof fieldsData === 'string') {
    alertRiskScore = fieldsData;
  } else if (Array.isArray(fieldsData) && fieldsData.length > 0) {
    alertRiskScore = fieldsData[0];
  } else {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs" data-test-subj={RISK_SCORE_TITLE_TEST_ID}>
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.header.riskScoreTitle"
              defaultMessage="Risk score"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span data-test-subj={RISK_SCORE_VALUE_TEST_ID}>{alertRiskScore}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RiskScore.displayName = 'RiskScore';

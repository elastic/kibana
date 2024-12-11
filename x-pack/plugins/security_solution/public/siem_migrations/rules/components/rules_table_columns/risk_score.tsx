/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { DEFAULT_TRANSLATION_RISK_SCORE } from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import type { TableColumn } from './constants';

export const createRiskScoreColumn = (): TableColumn => {
  return {
    field: 'risk_score',
    name: i18n.COLUMN_RISK_SCORE,
    render: () => (
      <EuiText data-test-subj="riskScore" size="s">
        {DEFAULT_TRANSLATION_RISK_SCORE}
      </EuiText>
    ),
    sortable: true,
    truncateText: true,
    width: '75px',
  };
};

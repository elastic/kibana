/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { CellActionsMode } from '@kbn/cell-actions';
import { getSourcererScopeId } from '../../../../helpers';
import { SecurityCellActions } from '../../../../common/components/cell_actions';
import { SecurityCellActionsTrigger } from '../../../../actions/constants';
import { useRightPanelContext } from '../context';
import { SeverityBadge } from '../../../../common/components/severity_badge';

const isSeverity = (x: unknown): x is Severity =>
  x === 'low' || x === 'medium' || x === 'high' || x === 'critical';

/**
 * Document details severity displayed in flyout right section header
 */
export const DocumentSeverity: FC = memo(() => {
  const { getFieldsData, scopeId } = useRightPanelContext();
  const fieldsData = getFieldsData(ALERT_SEVERITY);

  if (!fieldsData) {
    return null;
  }

  let alertSeverity: Severity;
  if (typeof fieldsData === 'string' && isSeverity(fieldsData)) {
    alertSeverity = fieldsData;
  } else if (Array.isArray(fieldsData) && fieldsData.length > 0 && isSeverity(fieldsData[0])) {
    alertSeverity = fieldsData[0];
  } else {
    return null;
  }

  return (
    <SecurityCellActions
      data={{
        field: ALERT_SEVERITY,
        value: alertSeverity,
      }}
      mode={CellActionsMode.HOVER_RIGHT}
      triggerId={SecurityCellActionsTrigger.DETAILS_FLYOUT}
      visibleCellActions={6}
      sourcererScopeId={getSourcererScopeId(scopeId)}
      metadata={{ scopeId }}
    >
      <SeverityBadge value={alertSeverity} />
    </SecurityCellActions>
  );
});

DocumentSeverity.displayName = 'DocumentSeverity';

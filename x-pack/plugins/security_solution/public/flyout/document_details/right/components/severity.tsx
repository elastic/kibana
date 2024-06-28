/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { CellActions } from './cell_actions';
import { useDocumentDetailsContext } from '../../shared/context';
import { SeverityBadge } from '../../../../common/components/severity_badge';

const isSeverity = (x: unknown): x is Severity =>
  x === 'low' || x === 'medium' || x === 'high' || x === 'critical';

/**
 * Document details severity displayed in flyout right section header
 */
export const DocumentSeverity = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
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
    <CellActions field={ALERT_SEVERITY} value={alertSeverity}>
      <SeverityBadge value={alertSeverity} />
    </CellActions>
  );
});

DocumentSeverity.displayName = 'DocumentSeverity';

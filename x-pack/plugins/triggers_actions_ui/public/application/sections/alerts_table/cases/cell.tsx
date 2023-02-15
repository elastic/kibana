/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { camelCase, mapKeys } from 'lodash';
import { EuiLink, EuiSkeletonText } from '@elastic/eui';
import { Tooltip as CaseTooltip } from '@kbn/cases-components';
import type { CaseTooltipContentProps } from '@kbn/cases-components';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { Case } from '../hooks/use_bulk_get_cases';
import { CellComponentProps } from '../types';

const CasesCellComponent: React.FC<CellComponentProps> = ({ isLoading, alert, cases }) => {
  const caseIds = alert[ALERT_CASE_IDS] ?? [];

  const alertCases = caseIds
    .map((id) => cases.get(id))
    .filter((theCase): theCase is Case => theCase != null);

  if (alertCases.length === 0) {
    return null;
  }

  const firstCase = alertCases[0];
  const firstCaseAsCamel = mapKeys(firstCase, (_, key) =>
    camelCase(key)
  ) as unknown as CaseTooltipContentProps;

  return (
    <EuiSkeletonText lines={1} isLoading={isLoading} size="s">
      <CaseTooltip
        loading={false}
        content={{ ...firstCaseAsCamel, totalComments: firstCase.totalComment }}
      >
        <EuiLink onClick={() => {}}>{firstCase.title}</EuiLink>
      </CaseTooltip>
    </EuiSkeletonText>
  );
};

CasesCellComponent.displayName = 'CasesCell';

export const CasesCell = memo(CasesCellComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink, EuiSkeletonText } from '@elastic/eui';
import { Tooltip as CaseTooltip } from '@kbn/cases-components';
import type { CaseTooltipContentProps } from '@kbn/cases-components';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { CellComponentProps } from '../types';
import { useCaseViewNavigation } from './use_case_view_navigation';
import { Case } from '../hooks/api';

const formatCase = (theCase: Case): CaseTooltipContentProps => ({
  title: theCase.title,
  description: theCase.description,
  createdAt: theCase.created_at,
  createdBy: {
    username: theCase.created_by.username ?? undefined,
    fullName: theCase.created_by.full_name ?? undefined,
  },
  status: theCase.status,
  totalComments: theCase.totalComment,
});

const CasesCellComponent: React.FC<CellComponentProps> = (props) => {
  const { isLoading, alert, cases } = props;
  const { navigateToCaseView } = useCaseViewNavigation();

  const caseIds = alert[ALERT_CASE_IDS] ?? [];

  const validCases = caseIds
    .map((id) => cases.get(id))
    .filter((theCase): theCase is Case => theCase != null);

  return (
    <EuiSkeletonText lines={1} isLoading={isLoading} size="s" data-test-subj="cases-cell-loading">
      {validCases.length !== 0
        ? validCases.map((theCase, index) => [
            index > 0 && index < validCases.length && ', ',
            <CaseTooltip loading={false} content={formatCase(theCase)} key={theCase.id}>
              <EuiLink
                onClick={() => navigateToCaseView({ caseId: theCase.id })}
                data-test-subj="cases-cell-link"
              >
                {theCase.title}
              </EuiLink>
            </CaseTooltip>,
          ])
        : '--'}
    </EuiSkeletonText>
  );
};

CasesCellComponent.displayName = 'CasesCell';

export const CasesCell = memo(CasesCellComponent);

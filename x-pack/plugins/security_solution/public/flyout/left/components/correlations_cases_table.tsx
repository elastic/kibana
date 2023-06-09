/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiBasicTableColumn, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import type { RelatedCaseInfo } from '@kbn/cases-plugin/common/api';
import React, { type FC, useCallback } from 'react';

import * as i18n from './translations';

interface CaseLinkProps {
  caseId: string;
}

const CaseLink: FC<CaseLinkProps> = ({ caseId, children }) => {
  const handleOnClick = useCallback(() => {}, []);

  return <EuiLink onClick={handleOnClick}>{children}</EuiLink>;
};

export interface CorrelationsCasesTableProps {
  cases: RelatedCaseInfo[];
}

const columns: Array<EuiBasicTableColumn<RelatedCaseInfo>> = [
  {
    field: 'title',
    name: i18n.CORRELATIONS_CASE_NAME_COLUMN_TITLE,
    truncateText: true,
    render: (value: string, caseData: RelatedCaseInfo) => (
      <CaseLink caseId={caseData.id}>{value}</CaseLink>
    ),
  },
  {
    field: 'status',
    name: i18n.CORRELATIONS_CASE_STATUS_COLUMN_TITLE,
    truncateText: true,
  },
];

export const CorrelationsCasesTable: FC<CorrelationsCasesTableProps> = ({ cases }) => (
  <EuiInMemoryTable items={cases} columns={columns} pagination={true} />
);

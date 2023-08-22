/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';
import type { RelatedCase } from '@kbn/cases-plugin/common';
import React, { type FC } from 'react';
import { CaseDetailsLink } from '../../../common/components/links';

import * as i18n from './translations';

export interface CorrelationsCasesTableProps {
  cases: RelatedCase[];
}

const columns: Array<EuiBasicTableColumn<RelatedCase>> = [
  {
    field: 'title',
    name: i18n.CORRELATIONS_CASE_NAME_COLUMN_TITLE,
    truncateText: true,
    render: (value: string, caseData: RelatedCase) => (
      <CaseDetailsLink detailName={caseData.id} title={caseData.title}>
        {caseData.title}
      </CaseDetailsLink>
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

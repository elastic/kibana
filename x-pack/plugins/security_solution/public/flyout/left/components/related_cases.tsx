/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiSkeletonText } from '@elastic/eui';
import type { RelatedCase } from '@kbn/cases-plugin/common';
import { CaseDetailsLink } from '../../../common/components/links';
import { CORRELATIONS_RELATED_CASES } from '../../shared/translations';
import {
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
} from './test_ids';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import {
  CORRELATIONS_CASE_NAME_COLUMN_TITLE,
  CORRELATIONS_CASE_STATUS_COLUMN_TITLE,
} from './translations';

const ICON = 'warning';

const columns: Array<EuiBasicTableColumn<RelatedCase>> = [
  {
    field: 'title',
    name: CORRELATIONS_CASE_NAME_COLUMN_TITLE,
    truncateText: true,
    render: (value: string, caseData: RelatedCase) => (
      <CaseDetailsLink detailName={caseData.id} title={caseData.title}>
        {caseData.title}
      </CaseDetailsLink>
    ),
  },
  {
    field: 'status',
    name: CORRELATIONS_CASE_STATUS_COLUMN_TITLE,
    truncateText: true,
  },
];

export interface RelatedCasesProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 *
 */
export const RelatedCases: React.VFC<RelatedCasesProps> = ({ eventId }) => {
  const { loading, error, data, dataCount } = useFetchRelatedCases({ eventId });
  const title = `${dataCount} ${CORRELATIONS_RELATED_CASES(dataCount)}`;

  if (loading) {
    return <EuiSkeletonText lines={1} size="m" isLoading={loading} contentAriaLabel="Loading" />;
  }

  if (error) {
    return null;
  }

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: ICON,
      }}
      content={{ error }}
      expand={{
        expandable: true,
        expandedOnFirstRender: true,
      }}
      data-test-subj={CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID}
    >
      <EuiInMemoryTable
        loading={loading}
        items={data}
        columns={columns}
        pagination={true}
        data-test-subj={CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID}
      />
    </ExpandablePanel>
  );
};

RelatedCases.displayName = 'RelatedCases';

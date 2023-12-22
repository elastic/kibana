/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import type { RelatedCase } from '@kbn/cases-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { CellTooltipWrapper } from '../../shared/components/cell_tooltip_wrapper';
import { CaseDetailsLink } from '../../../../common/components/links';
import {
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
} from './test_ids';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';

const ICON = 'warning';

const columns: Array<EuiBasicTableColumn<RelatedCase>> = [
  {
    field: 'title',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.correlations.nameColumnLabel"
        defaultMessage="Name"
      />
    ),
    render: (value: string, caseData: RelatedCase) => (
      <CellTooltipWrapper tooltip={caseData.title}>
        <CaseDetailsLink detailName={caseData.id} title={caseData.title}>
          {caseData.title}
        </CaseDetailsLink>
      </CellTooltipWrapper>
    ),
  },
  {
    field: 'status',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.correlations.statusColumnLabel"
        defaultMessage="Status"
      />
    ),
    truncateText: true,
    width: '25%',
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

  if (error) {
    return null;
  }

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.relatedCasesTitle"
            defaultMessage="{count} related {count, plural, one {case} other {cases}}"
            values={{ count: dataCount }}
          />
        ),
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
        message={
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.relatedCasesNoDataDescription"
            defaultMessage="No related cases."
          />
        }
        data-test-subj={CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID}
      />
    </ExpandablePanel>
  );
};

RelatedCases.displayName = 'RelatedCases';

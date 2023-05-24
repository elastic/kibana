/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';
import { ERROR_MESSAGE, ERROR_TITLE } from '../../shared/translations';
import { PREVALENCE_ERROR_MESSAGE } from './translations';
import {
  PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID,
  PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_NAME_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TYPE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
} from './test_ids';
import { PrevalenceDetailsCountCell } from './prevalence_details_count_cell';
import type { AlertSummaryRow } from '../../../common/components/event_details/helpers';
import { PrevalenceDetailsPrevalenceCell } from './prevalence_details_prevalence_cell';
import { getSummaryRows } from '../../../common/components/event_details/get_alert_summary_rows';
import { useLeftPanelContext } from '../context';
import { EventKind } from '../../shared/hooks/use_fetch_field_value_pair_by_event_type';

interface PrevalenceDetailsTableCell {
  field: string;
  values: string[];
  scopeId: string;
}

export const PREVALENCE_TAB_ID = 'prevalence-details';

const columns: Array<EuiBasicTableColumn<unknown>> = [
  {
    field: 'type',
    name: 'Type',
    'data-test-subj': PREVALENCE_DETAILS_TABLE_TYPE_CELL_TEST_ID,
  },
  {
    field: 'name',
    name: 'Name',
    'data-test-subj': PREVALENCE_DETAILS_TABLE_NAME_CELL_TEST_ID,
  },
  {
    field: 'alertCount',
    name: 'Alert Count',
    'data-test-subj': PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
    render: (data: PrevalenceDetailsTableCell) => (
      <PrevalenceDetailsCountCell
        field={data.field}
        values={data.values}
        scopeId={data.scopeId}
        type={{
          eventKind: EventKind.signal,
          include: true,
        }}
      />
    ),
  },
  {
    field: 'docCount',
    name: 'Doc Count',
    'data-test-subj': PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
    render: (data: PrevalenceDetailsTableCell) => (
      <PrevalenceDetailsCountCell
        field={data.field}
        values={data.values}
        scopeId={data.scopeId}
        type={{
          eventKind: EventKind.signal,
          exclude: true,
        }}
      />
    ),
  },
  {
    field: 'hostPrevalence',
    name: 'Host Prevalence (%)',
    'data-test-subj': PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
    render: (data: PrevalenceDetailsTableCell) => (
      <PrevalenceDetailsPrevalenceCell
        field={data.field}
        values={data.values}
        scopeId={data.scopeId}
        aggregationField={'host.name'}
      />
    ),
  },
  {
    field: 'userPrevalence',
    name: 'User Prevalence (%)',
    'data-test-subj': PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
    render: (data: PrevalenceDetailsTableCell) => (
      <PrevalenceDetailsPrevalenceCell
        field={data.field}
        values={data.values}
        scopeId={data.scopeId}
        aggregationField={'user.name'}
      />
    ),
  },
];

/**
 * Prevalence table displayed in the document details expandable flyout left section under the Insights tab
 */
export const PrevalenceDetails: React.FC = () => {
  const { browserFields, dataFormattedForFieldBrowser, eventId, scopeId } = useLeftPanelContext();

  const summaryRows = useMemo(
    () =>
      getSummaryRows({
        browserFields: browserFields || {},
        data: dataFormattedForFieldBrowser || [],
        eventId,
        scopeId,
        isReadOnly: false,
      }),
    [browserFields, dataFormattedForFieldBrowser, eventId, scopeId]
  );

  const getCellRenderFields = (summaryRow: AlertSummaryRow): PrevalenceDetailsTableCell => ({
    field: summaryRow.description.data.field,
    values: summaryRow.description.values || [],
    scopeId,
  });

  const data = (summaryRows || []).map((summaryRow) => {
    const fields = getCellRenderFields(summaryRow);
    return {
      type: summaryRow.description.data.field,
      name: summaryRow.description.values,
      alertCount: fields,
      docCount: fields,
      hostPrevalence: fields,
      userPrevalence: fields,
    };
  });

  if (
    !eventId ||
    !dataFormattedForFieldBrowser ||
    !browserFields ||
    !summaryRows ||
    summaryRows.length === 0
  ) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(PREVALENCE_ERROR_MESSAGE)}</h2>}
        body={<p>{ERROR_MESSAGE(PREVALENCE_ERROR_MESSAGE)}</p>}
        data-test-subj={PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID}
      />
    );
  }

  return (
    <EuiBasicTable
      tableCaption=""
      items={data}
      columns={columns}
      data-test-subj={PREVALENCE_DETAILS_TABLE_TEST_ID}
    />
  );
};

PrevalenceDetails.displayName = 'PrevalenceDetails';

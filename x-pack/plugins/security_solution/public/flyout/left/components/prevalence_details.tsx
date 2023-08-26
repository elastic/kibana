/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { PrevalenceData } from '../../shared/hooks/use_prevalence';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { ERROR_MESSAGE, ERROR_TITLE } from '../../shared/translations';
import {
  HOST_TITLE,
  PREVALENCE_ERROR_MESSAGE,
  PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE,
  PREVALENCE_TABLE_COUNT_COLUMN_TITLE,
  PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE,
  PREVALENCE_TABLE_VALUE_COLUMN_TITLE,
  PREVALENCE_TABLE_PREVALENCE_COLUMN_TITLE,
  PREVALENCE_TABLE_FIELD_COLUMN_TITLE,
  USER_TITLE,
  PREVALENCE_NO_DATA_MESSAGE,
} from './translations';
import {
  PREVALENCE_DETAILS_LOADING_TEST_ID,
  PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID,
  PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_NO_DATA_TEST_ID,
  PREVALENCE_DETAILS_DATE_PICKER_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
} from './test_ids';
import { useLeftPanelContext } from '../context';

export const PREVALENCE_TAB_ID = 'prevalence-details';
const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

const columns: Array<EuiBasicTableColumn<PrevalenceData>> = [
  {
    field: 'field',
    name: PREVALENCE_TABLE_FIELD_COLUMN_TITLE,
    'data-test-subj': PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID,
  },
  {
    field: 'value',
    name: PREVALENCE_TABLE_VALUE_COLUMN_TITLE,
    'data-test-subj': PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
  },
  {
    field: 'alertCount',
    name: (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>{PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE}</EuiFlexItem>
        <EuiFlexItem>{PREVALENCE_TABLE_COUNT_COLUMN_TITLE}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
    width: '10%',
  },
  {
    field: 'docCount',
    name: (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>{PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE}</EuiFlexItem>
        <EuiFlexItem>{PREVALENCE_TABLE_COUNT_COLUMN_TITLE}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
    width: '10%',
  },
  {
    field: 'hostPrevalence',
    name: (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>{HOST_TITLE}</EuiFlexItem>
        <EuiFlexItem>{PREVALENCE_TABLE_PREVALENCE_COLUMN_TITLE}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
    render: (hostPrevalence: number) => (
      <>
        {Math.round(hostPrevalence * 100)}
        {'%'}
      </>
    ),
    width: '10%',
  },
  {
    field: 'userPrevalence',
    name: (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>{USER_TITLE}</EuiFlexItem>
        <EuiFlexItem>{PREVALENCE_TABLE_PREVALENCE_COLUMN_TITLE}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
    render: (userPrevalence: number) => (
      <>
        {Math.round(userPrevalence * 100)}
        {'%'}
      </>
    ),
    width: '10%',
  },
];

/**
 * Prevalence table displayed in the document details expandable flyout left section under the Insights tab
 */
export const PrevalenceDetails: React.FC = () => {
  const { browserFields, dataFormattedForFieldBrowser, eventId, investigationFields } =
    useLeftPanelContext();

  const [start, setStart] = useState(DEFAULT_FROM);
  const [end, setEnd] = useState(DEFAULT_TO);

  const onTimeChange = ({ start: s, end: e }: OnTimeChangeProps) => {
    setStart(s);
    setEnd(e);
  };

  const { loading, error, data } = usePrevalence({
    dataFormattedForFieldBrowser,
    investigationFields,
    interval: {
      from: start,
      to: end,
    },
  });

  if (loading) {
    return (
      <EuiFlexGroup
        justifyContent="spaceAround"
        data-test-subj={PREVALENCE_DETAILS_LOADING_TEST_ID}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!eventId || !dataFormattedForFieldBrowser || !browserFields || error) {
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
    <>
      <EuiPanel>
        <EuiSuperDatePicker
          start={start}
          end={end}
          onTimeChange={onTimeChange}
          data-test-subj={PREVALENCE_DETAILS_DATE_PICKER_TEST_ID}
        />
        <EuiSpacer size="m" />
        {data.length > 0 ? (
          <EuiInMemoryTable
            items={data}
            columns={columns}
            data-test-subj={PREVALENCE_DETAILS_TABLE_TEST_ID}
            tableLayout="auto"
          />
        ) : (
          <div data-test-subj={`${PREVALENCE_DETAILS_TABLE_NO_DATA_TEST_ID}Error`}>
            {PREVALENCE_NO_DATA_MESSAGE}
          </div>
        )}
      </EuiPanel>
    </>
  );
};

PrevalenceDetails.displayName = 'PrevalenceDetails';

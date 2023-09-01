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
  EuiToolTip,
} from '@elastic/eui';
import { InvestigateInTimelineButton } from '../../../common/components/event_details/table/investigate_in_timeline_button';
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
  PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE_TOOLTIP,
  PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE_TOOLTIP,
  HOST_PREVALENCE_COLUMN_TITLE_TOOLTIP,
  USER_PREVALENCE_COLUMN_TITLE_TOOLTIP,
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
import {
  getDataProvider,
  getDataProviderAnd,
} from '../../../common/components/event_details/table/use_action_cell_data_provider';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { IS_OPERATOR } from '../../../../common/types';

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
    name: (
      <EuiToolTip content={PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE_TOOLTIP}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE}</EuiFlexItem>
          <EuiFlexItem>{PREVALENCE_TABLE_COUNT_COLUMN_TITLE}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
    render: (data: PrevalenceData) => {
      const dataProviders = [
        getDataProvider(data.field, `timeline-indicator-${data.field}-${data.value}`, data.value),
      ];
      return data.alertCount > 0 ? (
        <InvestigateInTimelineButton
          asEmptyButton={true}
          dataProviders={dataProviders}
          filters={[]}
        >
          <>{data.alertCount}</>
        </InvestigateInTimelineButton>
      ) : (
        getEmptyTagValue()
      );
    },
    width: '10%',
  },
  {
    name: (
      <EuiToolTip content={PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE_TOOLTIP}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE}</EuiFlexItem>
          <EuiFlexItem>{PREVALENCE_TABLE_COUNT_COLUMN_TITLE}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
    render: (data: PrevalenceData) => {
      const dataProviders = [
        {
          ...getDataProvider(
            data.field,
            `timeline-indicator-${data.field}-${data.value}`,
            data.value
          ),
          and: [
            getDataProviderAnd(
              'event.kind',
              `timeline-indicator-event.kind-not-signal`,
              'signal',
              IS_OPERATOR,
              true
            ),
          ],
        },
      ];
      return data.docCount > 0 ? (
        <InvestigateInTimelineButton
          asEmptyButton={true}
          dataProviders={dataProviders}
          filters={[]}
          keepDataView // changing dataview from only detections to include non-alerts docs
        >
          <>{data.docCount}</>
        </InvestigateInTimelineButton>
      ) : (
        getEmptyTagValue()
      );
    },
    width: '10%',
  },
  {
    field: 'hostPrevalence',
    name: (
      <EuiToolTip content={HOST_PREVALENCE_COLUMN_TITLE_TOOLTIP}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{HOST_TITLE}</EuiFlexItem>
          <EuiFlexItem>{PREVALENCE_TABLE_PREVALENCE_COLUMN_TITLE}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
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
      <EuiToolTip content={USER_PREVALENCE_COLUMN_TITLE_TOOLTIP}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{USER_TITLE}</EuiFlexItem>
          <EuiFlexItem>{PREVALENCE_TABLE_PREVALENCE_COLUMN_TITLE}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
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

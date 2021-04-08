/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { SummaryView } from './summary_view';
import { getSummaryColumns, Summary, SummaryRow, ThreatDetailsRow } from './helpers';
import { getDataFromSourceHits } from '../../../../common/utils/field_formatters';
import { INDICATOR_DESTINATION_PATH } from '../../../../common/constants';

const getDescription = ({ fieldName, value }: ThreatDetailsRow['description']): JSX.Element => (
  <EuiToolTip
    data-test-subj="message-tool-tip"
    content={
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <span>{fieldName}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    <>{value}</>
  </EuiToolTip>
);

const getSummaries = ({ data }: { data: TimelineEventsDetailsItem[] }): Summary[] => {
  if (!data) return [[]];
  return data.reduce<Summary[]>((acc, { category, field, originalValue }) => {
    if (field === INDICATOR_DESTINATION_PATH && originalValue) {
      const isOriginalValueArray = Array.isArray(originalValue);
      const isArrayIndexPresentInFieldName = isOriginalValueArray && originalValue.length > 1;
      const threatData = isArrayIndexPresentInFieldName
        ? originalValue.map((threatDataItem: string) => JSON.parse(threatDataItem))
        : isOriginalValueArray
        ? JSON.parse(originalValue[0])
        : JSON.parse(originalValue);

      let originalValueArrayIndex = -1;
      getDataFromSourceHits(threatData).forEach((threatInfoItem) => {
        const fieldName = `${INDICATOR_DESTINATION_PATH}.${
          isArrayIndexPresentInFieldName
            ? threatInfoItem.field.split('.').slice(1).join('.')
            : threatInfoItem.field
        }`;
        if (
          (!isArrayIndexPresentInFieldName && originalValueArrayIndex === -1) ||
          (isArrayIndexPresentInFieldName &&
            +threatInfoItem.field.split('.')[0] > originalValueArrayIndex)
        ) {
          originalValueArrayIndex++;
          acc.push([]);
        }
        acc[originalValueArrayIndex].push({
          title: fieldName.replace(`${INDICATOR_DESTINATION_PATH}.`, ''),
          description: { fieldName, value: threatInfoItem.originalValue },
        });
      });
    }
    return acc;
  }, []);
};

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(getDescription);

const ThreatDetailsViewComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
}> = ({ data }) => {
  const summaryLists = useMemo(() => getSummaries({ data }), [data]);

  return (
    <>
      {summaryLists.map((summaryList, index, arr) => (
        <div key={`threat-details-view-${index}`}>
          <SummaryView
            summaryColumns={summaryColumns}
            summaryList={summaryList}
            dataTestSubj={`threat-details-view-${index}`}
          />
          {index < arr.length - 1 && <EuiHorizontalRule />}
        </div>
      ))}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);

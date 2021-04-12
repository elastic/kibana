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
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from './helpers';
import { getDataFromSourceHits } from '../../../../common/utils/field_formatters';
import { INDICATOR_DESTINATION_PATH } from '../../../../common/constants';

const ThreatDetailsDescription: React.FC<ThreatDetailsRow['description']> = ({
  fieldName,
  value,
}) => (
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
    <span>{value}</span>
  </EuiToolTip>
);

const getSummaryRowsArray = ({
  data,
}: {
  data: TimelineEventsDetailsItem[];
}): ThreatDetailsRow[][] => {
  if (!data) return [[]];
  const threatInfo = data.find(
    ({ field, originalValue }) => field === INDICATOR_DESTINATION_PATH && originalValue
  );
  if (!threatInfo) return [[]];
  const { originalValue } = threatInfo;
  const values = Array.isArray(originalValue) ? originalValue : [originalValue];
  return values.map((value) =>
    getDataFromSourceHits(JSON.parse(value)).map((threatInfoItem) => ({
      title: threatInfoItem.field.replace(`${INDICATOR_DESTINATION_PATH}.`, ''),
      description: { fieldName: threatInfoItem.field, value: threatInfoItem.originalValue },
    }))
  );
};

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(
  ThreatDetailsDescription
);

const ThreatDetailsViewComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
}> = ({ data }) => {
  const summaryRowsArray = useMemo(() => getSummaryRowsArray({ data }), [data]);
  return (
    <>
      {summaryRowsArray.map((summaryRows, index, arr) => {
        const key = summaryRows.find((threat) => threat.title === 'matched.id')?.description
          .value[0];
        return (
          <div key={key}>
            <SummaryView
              summaryColumns={summaryColumns}
              summaryRows={summaryRows}
              dataTestSubj={`threat-details-view-${index}`}
            />
            {index < arr.length - 1 && <EuiHorizontalRule />}
          </div>
        );
      })}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);

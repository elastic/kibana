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
  EuiSpacer,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import React from 'react';

import { isEmpty } from 'fp-ts/Array';
import { SummaryView } from './summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from './helpers';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { INDICATOR_DESTINATION_PATH } from '../../../../common/constants';
import {
  FIRSTSEEN,
  INDICATOR_EVENT_URL,
  INDICATOR_REFERENCE,
} from '../../../../common/cti/constants';
import { EmptyThreatDetailsView } from './empty_threat_details_view';

const ThreatDetailsDescription: React.FC<ThreatDetailsRow['description']> = ({
  fieldName,
  value,
}) => {
  const tooltipChild = [INDICATOR_EVENT_URL, INDICATOR_REFERENCE].some(
    (field) => field === fieldName
  ) ? (
    <EuiLink href={value} target="_blank">
      {value}
    </EuiLink>
  ) : (
    <span>{value}</span>
  );
  return (
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
      {tooltipChild}
    </EuiToolTip>
  );
};

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(
  ThreatDetailsDescription
);

const getISOStringFromThreatDataItem = (threatDataItem: TimelineEventsDetailsItem[]) => {
  const firstSeen = threatDataItem.find(
    (item: TimelineEventsDetailsItem) => item.field === FIRSTSEEN
  );
  if (firstSeen) {
    const { originalValue } = firstSeen;
    const firstSeenValue = Array.isArray(originalValue) ? originalValue[0] : originalValue;
    if (!Number.isNaN(Date.parse(firstSeenValue))) {
      return firstSeenValue;
    }
  }
  return new Date(-1).toString();
};

const getThreatDetailsRowsArray = (threatData: TimelineEventsDetailsItem[][]) =>
  threatData
    .sort(
      (a, b) =>
        Date.parse(getISOStringFromThreatDataItem(b)) -
        Date.parse(getISOStringFromThreatDataItem(a))
    )
    .map((items) =>
      items.map(({ field, originalValue }) => ({
        title: field,
        description: {
          fieldName: `${INDICATOR_DESTINATION_PATH}.${field}`,
          value: Array.isArray(originalValue) ? originalValue[0] : originalValue,
        },
      }))
    );

const ThreatDetailsViewComponent: React.FC<{
  threatData: TimelineEventsDetailsItem[][];
}> = ({ threatData }) => {
  const threatDetailsRowsArray = getThreatDetailsRowsArray(threatData);
  return isEmpty(threatDetailsRowsArray) || isEmpty(threatDetailsRowsArray[0]) ? (
    <EmptyThreatDetailsView />
  ) : (
    <>
      {threatDetailsRowsArray.map((summaryRows, index, arr) => {
        const key = summaryRows.find((threat) => threat.title === 'matched.id')?.description
          .value[0];
        return (
          <div key={`${key}-${index}`}>
            {index === 0 && <EuiSpacer size="l" />}
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

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
} from '@elastic/eui';
import React from 'react';

import { SummaryView } from './summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from './helpers';

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

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(
  ThreatDetailsDescription
);

const ThreatDetailsViewComponent: React.FC<{
  threatDetailsRows: ThreatDetailsRow[][];
}> = ({ threatDetailsRows }) =>
  threatDetailsRows[0] !== [] ? (
    <>
      {threatDetailsRows.map((summaryRows, index, arr) => {
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
  ) : null;

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);

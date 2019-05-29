/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';

import { isGroupByDateHistogram, isGroupByHistogram, PivotGroupByConfig } from '../../common';

interface Props {
  item: PivotGroupByConfig;
  optionsDataId: string;
}

export const GroupByLabelSummary: React.SFC<Props> = ({ item, optionsDataId }) => {
  let interval: string | undefined;

  if (isGroupByDateHistogram(item)) {
    interval = item.calendar_interval;
  } else if (isGroupByHistogram(item)) {
    interval = item.interval;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem className="mlGroupByLabel--text">
        <span className="eui-textTruncate">{optionsDataId}</span>
      </EuiFlexItem>
      {interval !== undefined && (
        <EuiFlexItem grow={false} className="mlGroupByLabel--text mlGroupByLabel--interval">
          <EuiTextColor color="subdued" className="eui-textTruncate">
            {interval}
          </EuiTextColor>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

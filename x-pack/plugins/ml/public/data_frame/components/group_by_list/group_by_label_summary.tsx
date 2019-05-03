/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';

import { groupByConfigHasInterval, PivotGroupByConfig } from '../../common';

interface Props {
  item: PivotGroupByConfig;
  optionsDataId: string;
}

export const GroupByLabelSummary: React.SFC<Props> = ({ item, optionsDataId }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem className="mlGroupByLabel--text">
        <span className="mlGroupByLabel__text">{optionsDataId}</span>
      </EuiFlexItem>
      {groupByConfigHasInterval(item) && (
        <EuiFlexItem grow={false} className="mlGroupByLabel--text mlGroupByLabel--interval">
          <EuiTextColor color="subdued" className="mlGroupByLabel__text">
            {item.interval}
          </EuiTextColor>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

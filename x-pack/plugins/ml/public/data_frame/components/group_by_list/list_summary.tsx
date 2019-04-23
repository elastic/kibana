/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { PivotGroupByConfig, PivotGroupByConfigDict } from '../../common';

interface GroupByLabelProps {
  item: PivotGroupByConfig;
  optionsDataId: string;
}

const GroupByLabel: React.SFC<GroupByLabelProps> = ({ item, optionsDataId }) => {
  return 'interval' in item ? (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{optionsDataId}</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ color: '#999' }}>
        {item.interval}
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{optionsDataId}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ListProps {
  list: string[];
  optionsData: PivotGroupByConfigDict;
  deleteHandler?(l: string): void;
}

export const GroupByListSummary: React.SFC<ListProps> = ({ list, optionsData }) => (
  <EuiListGroup flush={true}>
    {list.map((optionsDataId: string) => {
      return (
        <Fragment key={optionsDataId}>
          <EuiPanel paddingSize="s">
            <EuiListGroupItem
              label={
                <GroupByLabel item={optionsData[optionsDataId]} optionsDataId={optionsDataId} />
              }
              style={{ padding: 0, display: 'block', width: '100%' }}
            />
          </EuiPanel>
          {list.length > 0 && <EuiSpacer size="s" />}
        </Fragment>
      );
    })}
  </EuiListGroup>
);

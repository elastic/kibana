/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiListGroup, EuiListGroupItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import { PivotGroupByConfigDict } from '../../common';

interface ListProps {
  list: string[];
  optionsData: PivotGroupByConfigDict;
  deleteHandler?(l: string): void;
}

export const GroupByList: React.SFC<ListProps> = ({ deleteHandler, list, optionsData }) => (
  <EuiListGroup flush={true}>
    {list.map((optionsDataId: string) => {
      return (
        <Fragment key={optionsDataId}>
          <EuiPanel paddingSize="s">
            <EuiListGroupItem
              iconType="string"
              label={optionsDataId}
              extraAction={
                (deleteHandler && {
                  onClick: () => deleteHandler(optionsDataId),
                  iconType: 'cross',
                  iconSize: 's',
                  'aria-label': optionsDataId,
                  alwaysShow: false,
                }) ||
                undefined
              }
              style={{ padding: 0 }}
            />
          </EuiPanel>
          {list.length > 0 && <EuiSpacer size="s" />}
        </Fragment>
      );
    })}
  </EuiListGroup>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiListGroup, EuiListGroupItem, EuiPanel, EuiSpacer } from '@elastic/eui';

interface ListProps {
  list: string[];
  deleteHandler?(l: string): void;
}

export const GroupByList: React.SFC<ListProps> = ({ deleteHandler, list }) => (
  <EuiListGroup flush={true}>
    {list.map((l: string) => (
      <Fragment key={l}>
        <EuiPanel paddingSize="s">
          <EuiListGroupItem
            iconType="string"
            label={l}
            extraAction={
              (deleteHandler && {
                onClick: () => deleteHandler(l),
                iconType: 'cross',
                iconSize: 's',
                'aria-label': l,
                alwaysShow: false,
              }) ||
              undefined
            }
            style={{ padding: 0 }}
          />
        </EuiPanel>
        {list.length > 0 && <EuiSpacer size="s" />}
      </Fragment>
    ))}
  </EuiListGroup>
);

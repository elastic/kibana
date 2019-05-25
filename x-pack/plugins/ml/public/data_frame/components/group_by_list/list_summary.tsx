/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { PivotGroupByConfigDict } from '../../common';

import { GroupByLabelSummary } from './group_by_label_summary';

interface ListProps {
  list: PivotGroupByConfigDict;
}

export const GroupByListSummary: React.SFC<ListProps> = ({ list }) => {
  const listKeys = Object.keys(list);
  return (
    <Fragment>
      {listKeys.map((optionsDataId: string) => {
        return (
          <Fragment key={optionsDataId}>
            <EuiPanel paddingSize="s">
              <GroupByLabelSummary item={list[optionsDataId]} optionsDataId={optionsDataId} />
            </EuiPanel>
            {listKeys.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </Fragment>
  );
};

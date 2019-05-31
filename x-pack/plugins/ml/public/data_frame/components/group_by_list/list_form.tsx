/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { AggName, PivotGroupByConfig, PivotGroupByConfigDict } from '../../common';

import { GroupByLabelForm } from './group_by_label_form';

interface ListProps {
  list: PivotGroupByConfigDict;
  options: PivotGroupByConfigDict;
  deleteHandler(l: string): void;
  onChange(id: string, item: PivotGroupByConfig): void;
}

export const GroupByListForm: React.SFC<ListProps> = ({
  deleteHandler,
  list,
  onChange,
  options,
}) => {
  const listKeys = Object.keys(list);
  return (
    <Fragment>
      {listKeys.map((aggName: AggName) => {
        const otherAggNames = listKeys.filter(k => k !== aggName);
        return (
          <Fragment key={aggName}>
            <EuiPanel paddingSize="s">
              <GroupByLabelForm
                deleteHandler={deleteHandler}
                item={list[aggName]}
                otherAggNames={otherAggNames}
                onChange={item => onChange(aggName, item)}
                options={options}
              />
            </EuiPanel>
            {listKeys.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </Fragment>
  );
};

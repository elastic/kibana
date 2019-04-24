/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { PivotGroupByConfig, PivotGroupByConfigDict } from '../../common';

import { GroupByLabelForm } from './group_by_label_form';

interface ListProps {
  list: PivotGroupByConfigDict;
  deleteHandler(l: string): void;
  onChange(id: string, item: PivotGroupByConfig): void;
}

export const GroupByListForm: React.SFC<ListProps> = ({ deleteHandler, list, onChange }) => {
  const listKeys = Object.keys(list);
  return (
    <Fragment>
      {listKeys.map((optionsDataId: string) => {
        return (
          <Fragment key={optionsDataId}>
            <EuiPanel paddingSize="s">
              <GroupByLabelForm
                deleteHandler={deleteHandler}
                item={list[optionsDataId]}
                onChange={onChange}
                optionsDataId={optionsDataId}
              />
            </EuiPanel>
            {listKeys.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </Fragment>
  );
};

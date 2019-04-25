/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import { Label, PivotAggsConfig, PivotAggsConfigDict } from '../../common';

import { AggLabelForm } from './agg_label_form';

export interface ListProps {
  list: PivotAggsConfigDict;
  options: PivotAggsConfigDict;
  deleteHandler(l: string): void;
  onChange(id: Label, item: PivotAggsConfig): void;
}

export const AggListForm: React.SFC<ListProps> = ({ deleteHandler, list, onChange, options }) => {
  const listKeys = Object.keys(list);
  return (
    <Fragment>
      {listKeys.map((optionsDataId: string) => (
        <Fragment key={optionsDataId}>
          <EuiPanel paddingSize="s">
            <EuiFlexGroup>
              <EuiFlexItem>
                <AggLabelForm
                  deleteHandler={deleteHandler}
                  item={list[optionsDataId]}
                  onChange={onChange}
                  options={options}
                  optionsDataId={optionsDataId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          {listKeys.length > 0 && <EuiSpacer size="s" />}
        </Fragment>
      ))}
    </Fragment>
  );
};

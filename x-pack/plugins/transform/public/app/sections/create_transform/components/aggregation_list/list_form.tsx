/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import {
  AggName,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotAggsConfigWithUiSupportDict,
} from '../../../../common';

import { AggLabelForm } from './agg_label_form';

export interface AggListProps {
  list: PivotAggsConfigDict;
  options: PivotAggsConfigWithUiSupportDict;
  deleteHandler(l: string): void;
  onChange(previousAggName: AggName, item: PivotAggsConfig): void;
}

export const AggListForm: React.FC<AggListProps> = ({ deleteHandler, list, onChange, options }) => {
  const listKeys = Object.keys(list);
  return (
    <Fragment>
      {listKeys.map((aggName: AggName, i) => {
        const otherAggNames = listKeys.filter((k) => k !== aggName);
        return (
          <Fragment key={aggName}>
            <EuiPanel paddingSize="s" data-test-subj={`transformAggregationEntry_${i}`}>
              <AggLabelForm
                deleteHandler={deleteHandler}
                item={list[aggName]}
                onChange={(item) => onChange(aggName, item)}
                otherAggNames={otherAggNames}
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

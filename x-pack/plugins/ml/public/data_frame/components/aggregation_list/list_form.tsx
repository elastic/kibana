/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';

import { PivotAggsConfigDict } from '../../common';

export interface ListProps {
  list: string[];
  optionsData: PivotAggsConfigDict;
  deleteHandler?(l: string): void;
}

export const AggListForm: React.SFC<ListProps> = ({ deleteHandler, list, optionsData }) => (
  <EuiListGroup flush={true}>
    {list.map((optionsDataId: string) => (
      <EuiListGroupItem
        key={optionsDataId}
        label={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.aggregationListForm.customNameLabel', {
                  defaultMessage: 'Custom name',
                })}
              >
                <EuiFieldText defaultValue={optionsData[optionsDataId].formRowLabel} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.aggregationListForm.aggregationLabel', {
                  defaultMessage: 'Aggregation',
                })}
              >
                <EuiFieldText defaultValue={optionsData[optionsDataId].agg} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.aggregationListForm.fieldLabel', {
                  defaultMessage: 'Field',
                })}
              >
                <EuiFieldText defaultValue={optionsData[optionsDataId].field} />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
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
      />
    ))}
  </EuiListGroup>
);

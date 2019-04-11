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

import { Dictionary } from '../../../../common/types/common';

interface OptionsDataElement {
  agg: string;
  field: string;
  formRowLabel: string;
}

interface ListProps {
  list: string[];
  optionsData: Dictionary<OptionsDataElement>;
  deleteHandler?(l: string): void;
}

export const AggListForm: React.SFC<ListProps> = ({ deleteHandler, list, optionsData }) => (
  <EuiListGroup flush={true}>
    {list.map((l: string) => (
      <EuiListGroupItem
        key={l}
        label={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.aggregationListForm.customNameLabel', {
                  defaultMessage: 'Custom name',
                })}
              >
                <EuiFieldText defaultValue={optionsData[l].formRowLabel} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.aggregationListForm.aggregationLabel', {
                  defaultMessage: 'Aggregation',
                })}
              >
                <EuiFieldText defaultValue={optionsData[l].agg} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.aggregationListForm.fieldLabel', {
                  defaultMessage: 'Field',
                })}
              >
                <EuiFieldText defaultValue={optionsData[l].field} />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
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
      />
    ))}
  </EuiListGroup>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FilterAggConfigRange } from '../types';

/**
 * Form component for the range filter aggregation for number type fields.
 */
export const FilterRangeForm: FilterAggConfigRange['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
}) => {
  const greaterThan = config?.gt ?? config?.gte ?? '';
  const lessThan = config?.lt ?? config?.lte ?? '';

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.transform.agg.popoverForm.filerAgg.range.greaterThanLabel"
                defaultMessage="Greater than"
              />
            }
          >
            <EuiFieldNumber
              value={greaterThan}
              onChange={(e) => {
                onChange({
                  config: {
                    ...config,
                    gt: e.target.value === '' ? undefined : Number(e.target.value),
                  },
                });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.transform.agg.popoverForm.filerAgg.range.lessThanLabel"
                defaultMessage="Less than"
              />
            }
          >
            <EuiFieldNumber
              value={lessThan}
              onChange={(e) => {
                onChange({
                  config: {
                    ...config,
                    lt: e.target.value === '' ? undefined : Number(e.target.value),
                  },
                });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

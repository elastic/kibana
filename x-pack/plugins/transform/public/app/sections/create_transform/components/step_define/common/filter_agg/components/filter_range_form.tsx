/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import {
  EuiFieldNumber,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonToggle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FilterAggConfigRange } from '../types';

/**
 * Form component for the range filter aggregation for number type fields.
 */
export const FilterRangeForm: FilterAggConfigRange['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
}) => {
  const from = config?.from ?? '';
  const to = config?.to ?? '';
  const includeFrom = config?.includeFrom ?? false;
  const includeTo = config?.includeTo ?? false;

  const updateConfig = useCallback(
    (update) => {
      onChange({
        config: {
          ...config,
          ...update,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  );

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
              value={from}
              max={to !== '' ? to : undefined}
              onChange={(e) => {
                updateConfig({ from: e.target.value === '' ? undefined : Number(e.target.value) });
              }}
              // @ts-ignore
              step="any"
              prepend={
                <EuiButtonToggle
                  style={{ minWidth: '40px' }}
                  label={includeFrom ? '≥' : '>'}
                  onChange={(e: any) => {
                    updateConfig({ includeFrom: e.target.checked });
                  }}
                  isSelected={includeFrom}
                  isEmpty={!includeFrom}
                />
              }
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
              value={to}
              min={from !== '' ? from : undefined}
              onChange={(e) => {
                updateConfig({ to: e.target.value === '' ? undefined : Number(e.target.value) });
              }}
              // @ts-ignore
              step="any"
              append={
                <EuiButtonToggle
                  style={{ minWidth: '40px' }}
                  label={includeTo ? '≤' : '<'}
                  onChange={(e: any) => {
                    updateConfig({ includeTo: e.target.checked });
                  }}
                  isSelected={includeTo}
                  isEmpty={!includeTo}
                />
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

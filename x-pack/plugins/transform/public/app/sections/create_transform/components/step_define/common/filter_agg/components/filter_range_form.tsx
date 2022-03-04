/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFieldNumber,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FilterAggConfigRange } from '../types';

const BUTTON_SIZE = 40;
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
      <EuiFlexGroup direction="row">
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
              step="any"
              prepend={
                <EuiButton
                  minWidth={BUTTON_SIZE}
                  style={{ maxWidth: BUTTON_SIZE }}
                  onChange={(e: any) => {
                    updateConfig({ includeFrom: e.target.checked });
                  }}
                  fill={includeFrom}
                >
                  {includeFrom ? '≥' : '>'}
                </EuiButton>
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
              step="any"
              append={
                <EuiButton
                  minWidth={BUTTON_SIZE}
                  style={{ maxWidth: BUTTON_SIZE }}
                  onClick={() => {
                    updateConfig({ includeTo: !includeTo });
                  }}
                  fill={includeTo}
                >
                  {includeTo ? '≤' : '<'}
                </EuiButton>
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

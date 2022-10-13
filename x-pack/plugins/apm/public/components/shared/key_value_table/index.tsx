/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { castArray } from 'lodash';
import React, { TableHTMLAttributes } from 'react';
import {
  EuiTable,
  EuiTableProps,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';
import { FormattedValue } from './formatted_value';
import { KeyValuePair } from '../../../utils/flatten_object';

export function KeyValueTable({
  keyValuePairs,
  tableProps = {},
}: {
  keyValuePairs: KeyValuePair[];
  tableProps?: EuiTableProps & TableHTMLAttributes<HTMLTableElement>;
}) {
  return (
    <EuiTable compressed {...tableProps}>
      <EuiTableBody>
        {keyValuePairs.map(({ key, value }) => {
          const asArray = castArray(value);
          const valueList =
            asArray.length <= 1 ? (
              <FormattedValue value={asArray[0]} />
            ) : (
              <ul>
                {asArray.map((val, index) => (
                  <li>
                    <FormattedValue key={index} value={val} />
                  </li>
                ))}
              </ul>
            );

          return (
            <EuiTableRow key={key}>
              <EuiTableRowCell>
                <strong data-test-subj="dot-key">{key}</strong>
              </EuiTableRowCell>
              <EuiTableRowCell data-test-subj="value">
                {valueList}
              </EuiTableRowCell>
            </EuiTableRow>
          );
        })}
      </EuiTableBody>
    </EuiTable>
  );
}

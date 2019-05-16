/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { TableHTMLAttributes } from 'react';
import { compact, isObject } from 'lodash';
import {
  EuiTable,
  EuiTableProps,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell
} from '@elastic/eui';
import { StringMap } from '../../../../typings/common';
import { FormattedValue } from './FormattedValue';

interface PathifyOptions {
  maxDepth?: number;
  parentKey?: string;
  depth?: number;
}

interface PathifyResult {
  [key: string]: any;
}

/**
 * Converts a deeply-nested object into a one-level object
 * with dot-notation paths as keys.
 */
export function pathify(
  item: StringMap<any>,
  { maxDepth, parentKey = '', depth = 0 }: PathifyOptions
): PathifyResult {
  return Object.keys(item)
    .sort()
    .reduce((pathified, key) => {
      const currentKey = compact([parentKey, key]).join('.');
      if ((!maxDepth || depth + 1 <= maxDepth) && isObject(item[key])) {
        return {
          ...pathified,
          ...pathify(item[key], {
            maxDepth,
            parentKey: currentKey,
            depth: depth + 1
          })
        };
      } else {
        return { ...pathified, [currentKey]: item[key] };
      }
    }, {});
}

export function DottedKeyValueTable({
  data,
  parentKey,
  maxDepth,
  tableProps = {}
}: {
  data: StringMap;
  parentKey?: string;
  maxDepth?: number;
  tableProps?: EuiTableProps & TableHTMLAttributes<HTMLTableElement>;
}) {
  const pathified = pathify(data, { maxDepth, parentKey });
  const rows = Object.keys(pathified)
    .sort()
    .map(k => [k, pathified[k]]);
  return (
    <EuiTable compressed {...tableProps}>
      <EuiTableBody>
        {rows.map(([key, value]) => (
          <EuiTableRow key={key}>
            <EuiTableRowCell>
              <strong data-testid="dot-key">{key}</strong>
            </EuiTableRowCell>
            <EuiTableRowCell data-testid="value">
              <FormattedValue value={value} />
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { compact, isObject } from 'lodash';
import {
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell
} from '@elastic/eui';
import { StringMap } from '../../../../typings/common';
import { FormattedValue } from './FormattedValue';

interface PathifyOptions {
  maxDepth: number;
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
  return Object.keys(item).reduce((pathified, key) => {
    const currentKey = compact([parentKey, key]).join('.');
    if (depth + 1 <= maxDepth && isObject(item[key])) {
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
  maxDepth
}: {
  data: StringMap;
  parentKey?: string;
  maxDepth: number;
}) {
  const pathified = pathify(data, { maxDepth, parentKey });
  const rows = Object.keys(pathified).map(k => [k, pathified[k]]);
  return (
    <EuiTable compressed>
      <EuiTableBody>
        {rows.map(([key, value]) => (
          <EuiTableRow key={key}>
            <EuiTableRowCell>
              <strong>{key}</strong>
            </EuiTableRowCell>
            <EuiTableRowCell>
              <FormattedValue value={value} />
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );
}

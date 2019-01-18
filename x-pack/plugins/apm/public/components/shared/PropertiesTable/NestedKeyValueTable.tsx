/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { StringMap } from '../../../../typings/common';
import { NOT_AVAILABLE_LABEL } from '../../../constants';
import {
  colors,
  fontFamilyCode,
  fontSizes,
  px,
  units
} from '../../../style/variables';

export type KeySorter = (data: StringMap, parentKey?: string) => string[];

const Table = styled.table`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.small};
  width: 100%;
`;

const Row = styled.tr`
  border-bottom: ${px(1)} solid ${colors.gray4};
  &:last-child {
    border: 0;
  }
`;

const Cell = styled.td`
  vertical-align: top;
  padding: ${px(units.half)} 0;
  line-height: 1.5;

  ${Row}:first-child> & {
    padding-top: 0;
  }

  ${Row}:last-child> & {
    padding-bottom: 0;
  }

  &:first-child {
    width: ${px(units.unit * 20)};
    font-weight: bold;
  }
`;

const EmptyValue = styled.span`
  color: ${colors.gray3};
`;

export function FormattedKey({
  k,
  value
}: {
  k: string;
  value: unknown;
}): JSX.Element {
  if (value == null) {
    return <EmptyValue>{k}</EmptyValue>;
  }

  return <React.Fragment>{k}</React.Fragment>;
}

export function FormattedValue({ value }: { value: any }): JSX.Element {
  if (isObject(value)) {
    return <pre>{JSON.stringify(value, null, 4)}</pre>;
  } else if (isBoolean(value) || isNumber(value)) {
    return <React.Fragment>{String(value)}</React.Fragment>;
  } else if (!value) {
    return <EmptyValue>{NOT_AVAILABLE_LABEL}</EmptyValue>;
  }

  return <React.Fragment>{value}</React.Fragment>;
}

export function NestedValue({
  parentKey,
  value,
  depth,
  keySorter
}: {
  value: StringMap;
  depth: number;
  parentKey?: string;
  keySorter?: KeySorter;
}): JSX.Element {
  if (depth > 0 && isObject(value)) {
    return (
      <NestedKeyValueTable
        data={value}
        parentKey={parentKey}
        keySorter={keySorter}
        depth={depth - 1}
      />
    );
  }

  return <FormattedValue value={value} />;
}

export function NestedKeyValueTable({
  data,
  parentKey,
  keySorter = Object.keys,
  depth = 0
}: {
  data: StringMap<any>;
  parentKey?: string;
  keySorter?: KeySorter;
  depth?: number;
}): JSX.Element {
  return (
    <Table>
      <tbody>
        {keySorter(data, parentKey).map(key => (
          <Row key={key}>
            <Cell>
              <FormattedKey k={key} value={data[key]} />
            </Cell>
            <Cell>
              <NestedValue
                parentKey={key}
                value={data[key]}
                keySorter={keySorter}
                depth={depth}
              />
            </Cell>
          </Row>
        ))}
      </tbody>
    </Table>
  );
}

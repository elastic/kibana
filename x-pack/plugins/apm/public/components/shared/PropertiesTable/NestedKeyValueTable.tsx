/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { StringMap } from '../../../../typings/common';
import { fontFamilyCode, fontSize, px, units } from '../../../style/variables';
import { sortKeysByConfig } from './tabConfig';

const Table = styled.table`
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
  width: 100%;
`;

const Row = styled.tr`
  border-bottom: ${px(1)} solid ${theme.euiColorLightShade};
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
    width: ${px(units.unit * 12)};
    font-weight: bold;
  }
`;

const EmptyValue = styled.span`
  color: ${theme.euiColorMediumShade};
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
  depth
}: {
  value: unknown;
  depth: number;
  parentKey?: string;
}): JSX.Element {
  const MAX_LEVEL = 3;
  if (depth < MAX_LEVEL && isObject(value)) {
    return (
      <NestedKeyValueTable
        data={value as StringMap}
        parentKey={parentKey}
        depth={depth + 1}
      />
    );
  }

  return <FormattedValue value={value} />;
}

export function NestedKeyValueTable({
  data,
  parentKey,
  depth
}: {
  data: StringMap;
  parentKey?: string;
  depth: number;
}): JSX.Element {
  return (
    <Table>
      <tbody>
        {sortKeysByConfig(data, parentKey).map(key => (
          <Row key={key}>
            <Cell>
              <FormattedKey k={key} value={data[key]} />
            </Cell>
            <Cell>
              <NestedValue parentKey={key} value={data[key]} depth={depth} />
            </Cell>
          </Row>
        ))}
      </tbody>
    </Table>
  );
}

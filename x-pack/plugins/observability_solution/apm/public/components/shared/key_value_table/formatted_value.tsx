/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';

const EmptyValue = euiStyled.span<{ euiTheme: EuiThemeComputed }>`
  color: ${({ euiTheme }) => euiTheme.colors.mediumShade};
  text-align: left;
`;

export function FormattedKey({ k, value }: { k: string; value: unknown }): JSX.Element {
  const { euiTheme } = useEuiTheme();
  if (value == null) {
    return <EmptyValue euiTheme={euiTheme}>{k}</EmptyValue>;
  }

  return <React.Fragment>{k}</React.Fragment>;
}

export function FormattedValue({ value }: { value: any }): JSX.Element {
  const { euiTheme } = useEuiTheme();
  if (isObject(value)) {
    return <pre>{JSON.stringify(value, null, 4)}</pre>;
  } else if (isBoolean(value) || isNumber(value)) {
    return <React.Fragment>{String(value)}</React.Fragment>;
  } else if (!value) {
    return <EmptyValue euiTheme={euiTheme}>{NOT_AVAILABLE_LABEL}</EmptyValue>;
  }

  return <React.Fragment>{value}</React.Fragment>;
}

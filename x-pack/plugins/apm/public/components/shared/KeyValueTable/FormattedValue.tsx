/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';

const EmptyValue = euiStyled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
  text-align: left;
`;

export function FormattedKey({
  k,
  value,
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

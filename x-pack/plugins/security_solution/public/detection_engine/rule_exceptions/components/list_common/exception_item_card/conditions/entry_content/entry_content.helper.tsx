/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiExpression, EuiBadge } from '@elastic/eui';

import { ValueWithSpaceWarning } from '../../..';

import { OPERATOR_TYPE_LABELS_EXCLUDED, OPERATOR_TYPE_LABELS_INCLUDED } from '../conditions.config';
import type { Entry } from '../types';

const getEntryValue = (type: string, value: string | string[] | undefined) => {
  if (type === 'match_any' && Array.isArray(value)) {
    return value.map((currentValue) => <EuiBadge color="hollow">{currentValue}</EuiBadge>);
  }
  return value ?? '';
};

export const getEntryOperator = (type: string, operator: string) => {
  if (type === 'nested') return '';
  return operator === 'included'
    ? OPERATOR_TYPE_LABELS_INCLUDED[type as keyof typeof OPERATOR_TYPE_LABELS_INCLUDED] ?? type
    : OPERATOR_TYPE_LABELS_EXCLUDED[type as keyof typeof OPERATOR_TYPE_LABELS_EXCLUDED] ?? type;
};

export const getValue = (entry: Entry) => {
  if (entry.type === 'list') return entry.list.id;

  return 'value' in entry ? entry.value : '';
};

export const getValueExpression = (type: string, operator: string, value: string | string[]) => (
  <>
    <EuiExpression
      description={getEntryOperator(type, operator)}
      value={getEntryValue(type, value)}
    />
    <ValueWithSpaceWarning value={value} />
  </>
);

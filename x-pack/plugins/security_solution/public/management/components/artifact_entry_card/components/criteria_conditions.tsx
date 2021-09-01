/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiExpression } from '@elastic/eui';
import { OsType, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  CONDITION_OS,
  OS_LINUX,
  OS_MAC,
  OS_WINDOWS,
  CONDITION_AND,
  CONDITION_OPERATOR_TYPE_WILDCARD,
  CONDITION_OPERATOR_TYPE_NESTED,
  CONDITION_OPERATOR_TYPE_MATCH,
  CONDITION_OPERATOR_TYPE_MATCH_ANY,
  CONDITION_OPERATOR_TYPE_EXISTS,
  CONDITION_OPERATOR_TYPE_LIST,
} from './translations';
import { OperatingSystem, TrustedAppEntryTypes } from '../../../../../common/endpoint/types';

// OS type supporting both Trusted Apps and Exceptions
type OS_TYPES = OperatingSystem & OsType;

const OS_LABELS: Readonly<{ [key in OS_TYPES]: string }> = Object.freeze({
  linux: OS_LINUX,
  mac: OS_MAC,
  windows: OS_WINDOWS,
});

// operator types supporting both Trusted Apps and Exceptions
type OPERATOR_TYPES = TrustedAppEntryTypes &
  typeof ListOperatorTypeEnum[keyof typeof ListOperatorTypeEnum];

const OPERATOR_TYPE_LABELS: Readonly<{ [key in OPERATOR_TYPES]: string }> = Object.freeze({
  [ListOperatorTypeEnum.NESTED]: CONDITION_OPERATOR_TYPE_NESTED,
  [ListOperatorTypeEnum.MATCH_ANY]: CONDITION_OPERATOR_TYPE_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: CONDITION_OPERATOR_TYPE_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: CONDITION_OPERATOR_TYPE_WILDCARD,
  [ListOperatorTypeEnum.EXISTS]: CONDITION_OPERATOR_TYPE_EXISTS,
  [ListOperatorTypeEnum.LIST]: CONDITION_OPERATOR_TYPE_LIST,
});

interface ConditionEntry {
  field: string;
  type: string;
  operator: string;
  value: string;
}

export interface CriteriaConditionsProps<T extends ConditionEntry = ConditionEntry> {
  os: OS_TYPES;
  entries: [];
}

export const CriteriaConditions = memo<CriteriaConditionsProps>(({ os, entries }) => {
  return (
    <div>
      {os && (
        <div>
          <strong>
            <EuiExpression description={''} value={CONDITION_OS} />
            <EuiExpression description={CONDITION_OPERATOR_TYPE_MATCH} value={OS_LABELS[os]} />
          </strong>
        </div>
      )}
      {entries.map(({ field, type, value }) => {
        return (
          <div>
            <EuiExpression description={CONDITION_AND} value={field} color="subdued" />
            <EuiExpression description={OPERATOR_TYPE_LABELS[type]} value={value} />
          </div>
        );
      })}
    </div>
  );
});
CriteriaConditions.displayName = 'CriteriaConditions';

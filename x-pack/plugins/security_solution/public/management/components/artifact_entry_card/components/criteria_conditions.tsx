/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  CommonProps,
  EuiExpression,
  EuiToken,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import styled from 'styled-components';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  CONDITION_OS,
  OS_LINUX,
  OS_MAC,
  OS_WINDOWS,
  CONDITION_AND,
  CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES,
  CONDITION_OPERATOR_TYPE_NESTED,
  CONDITION_OPERATOR_TYPE_MATCH,
  CONDITION_OPERATOR_TYPE_MATCH_ANY,
  CONDITION_OPERATOR_TYPE_EXISTS,
  CONDITION_OPERATOR_TYPE_LIST,
  CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY,
  CONDITION_OPERATOR_TYPE_NOT_MATCH,
} from './translations';
import { ArtifactInfo, ArtifactInfoEntry } from '../types';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

const OS_LABELS = Object.freeze({
  linux: OS_LINUX,
  mac: OS_MAC,
  macos: OS_MAC,
  windows: OS_WINDOWS,
});

const OPERATOR_TYPE_LABELS_INCLUDED = Object.freeze({
  [ListOperatorTypeEnum.NESTED]: CONDITION_OPERATOR_TYPE_NESTED,
  [ListOperatorTypeEnum.MATCH_ANY]: CONDITION_OPERATOR_TYPE_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: CONDITION_OPERATOR_TYPE_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES,
  [ListOperatorTypeEnum.EXISTS]: CONDITION_OPERATOR_TYPE_EXISTS,
  [ListOperatorTypeEnum.LIST]: CONDITION_OPERATOR_TYPE_LIST,
});

const OPERATOR_TYPE_LABELS_EXCLUDED = Object.freeze({
  [ListOperatorTypeEnum.MATCH_ANY]: CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: CONDITION_OPERATOR_TYPE_NOT_MATCH,
});

const EuiFlexGroupNested = styled(EuiFlexGroup)`
  margin-left: ${({ theme }) => theme.eui.spacerSizes.xl};
`;

const EuiFlexItemNested = styled(EuiFlexItem)`
  margin-bottom: 6px !important;
  margin-top: 6px !important;
`;

const StyledCondition = styled('span')`
  margin-right: 6px;
`;

export type CriteriaConditionsProps = Pick<ArtifactInfo, 'os' | 'entries'> &
  Pick<CommonProps, 'data-test-subj'>;

export const CriteriaConditions = memo<CriteriaConditionsProps>(
  ({ os, entries, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const osLabel = useMemo(() => {
      return os
        .map((osValue) => OS_LABELS[osValue as keyof typeof OS_LABELS] ?? osValue)
        .join(', ');
    }, [os]);

    const getEntryValue = (type: string, value: string | string[]) => {
      if (type === 'match_any' && Array.isArray(value)) {
        return value.map((currentValue) => <EuiBadge color="hollow">{currentValue}</EuiBadge>);
      }
      return value;
    };

    const getEntryOperator = (type: string, operator: string) => {
      if (type === 'nested') return '';
      return operator === 'included'
        ? OPERATOR_TYPE_LABELS_INCLUDED[type as keyof typeof OPERATOR_TYPE_LABELS_INCLUDED] ?? type
        : OPERATOR_TYPE_LABELS_EXCLUDED[type as keyof typeof OPERATOR_TYPE_LABELS_EXCLUDED] ?? type;
    };

    const getNestedEntriesContent = useCallback(
      (type: string, nestedEntries: ArtifactInfoEntry[]) => {
        if (type === 'nested' && nestedEntries.length) {
          return nestedEntries.map(
            ({
              field: nestedField,
              type: nestedType,
              value: nestedValue,
              operator: nestedOperator,
            }) => {
              return (
                <EuiFlexGroupNested
                  data-test-subj={getTestId('nestedCondition')}
                  key={nestedField + nestedType + nestedValue}
                  direction="row"
                  alignItems="center"
                  gutterSize="m"
                  responsive={false}
                >
                  <EuiFlexItemNested grow={false}>
                    <EuiToken iconType="tokenNested" size="s" />
                  </EuiFlexItemNested>
                  <EuiFlexItemNested grow={false}>
                    <EuiExpression description={''} value={nestedField} color="subdued" />
                  </EuiFlexItemNested>
                  <EuiFlexItemNested grow={false}>
                    <EuiExpression
                      description={getEntryOperator(nestedType, nestedOperator)}
                      value={getEntryValue(nestedType, nestedValue)}
                    />
                  </EuiFlexItemNested>
                </EuiFlexGroupNested>
              );
            }
          );
        }
      },
      [getTestId]
    );

    return (
      <div data-test-subj={dataTestSubj}>
        <div data-test-subj={getTestId('os')}>
          <strong>
            <EuiExpression description={''} value={CONDITION_OS} />
            <EuiExpression description={CONDITION_OPERATOR_TYPE_MATCH} value={osLabel} />
          </strong>
        </div>
        {entries.map(({ field, type, value, operator, entries: nestedEntries = [] }) => {
          return (
            <div data-test-subj={getTestId('condition')} key={field + type + value}>
              <div className="eui-xScroll">
                <EuiExpression
                  description={<StyledCondition>{CONDITION_AND}</StyledCondition>}
                  value={field}
                  color="subdued"
                />
                <EuiExpression
                  description={getEntryOperator(type, operator)}
                  value={getEntryValue(type, value)}
                />
              </div>
              {getNestedEntriesContent(type, nestedEntries)}
            </div>
          );
        })}
      </div>
    );
  }
);
CriteriaConditions.displayName = 'CriteriaConditions';

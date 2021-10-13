/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { CommonProps, EuiExpression, EuiToken, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
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
import { ArtifactInfo, ArtifactInfoEntry } from '../types';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

const OS_LABELS = Object.freeze({
  linux: OS_LINUX,
  mac: OS_MAC,
  windows: OS_WINDOWS,
});

const OPERATOR_TYPE_LABELS = Object.freeze({
  [ListOperatorTypeEnum.NESTED]: CONDITION_OPERATOR_TYPE_NESTED,
  [ListOperatorTypeEnum.MATCH_ANY]: CONDITION_OPERATOR_TYPE_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: CONDITION_OPERATOR_TYPE_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: CONDITION_OPERATOR_TYPE_WILDCARD,
  [ListOperatorTypeEnum.EXISTS]: CONDITION_OPERATOR_TYPE_EXISTS,
  [ListOperatorTypeEnum.LIST]: CONDITION_OPERATOR_TYPE_LIST,
});

const EuiFlexGroupNested = styled(EuiFlexGroup)`
  margin-left: ${({ theme }) => theme.eui.spacerSizes.l};
`;

const EuiFlexItemNested = styled(EuiFlexItem)`
  margin-bottom: 6px !important;
  margin-top: 6px !important;
`;

export type CriteriaConditionsProps = Pick<ArtifactInfo, 'os' | 'entries'> &
  Pick<CommonProps, 'data-test-subj'>;

export const CriteriaConditions = memo<CriteriaConditionsProps>(
  ({ os, entries, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const getNestedEntriesContent = useCallback(
      (type: string, nestedEntries: ArtifactInfoEntry[]) => {
        if (type === 'nested' && nestedEntries.length) {
          return nestedEntries.map(
            ({ field: nestedField, type: nestedType, value: nestedValue }) => {
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
                      description={
                        OPERATOR_TYPE_LABELS[nestedType as keyof typeof OPERATOR_TYPE_LABELS] ??
                        nestedType
                      }
                      value={nestedValue}
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
            <EuiExpression
              description={CONDITION_OPERATOR_TYPE_MATCH}
              value={OS_LABELS[os as keyof typeof OS_LABELS] ?? os}
            />
          </strong>
        </div>
        {entries.map(({ field, type, value, entries: nestedEntries = [] }) => {
          return (
            <div data-test-subj={getTestId('condition')} key={field + type + value}>
              <EuiExpression description={CONDITION_AND} value={field} color="subdued" />
              <EuiExpression
                description={
                  OPERATOR_TYPE_LABELS[type as keyof typeof OPERATOR_TYPE_LABELS] ?? type
                }
                value={value}
              />
              {getNestedEntriesContent(type, nestedEntries)}
            </div>
          );
        })}
      </div>
    );
  }
);
CriteriaConditions.displayName = 'CriteriaConditions';

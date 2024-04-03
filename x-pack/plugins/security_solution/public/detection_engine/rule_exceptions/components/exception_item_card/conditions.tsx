/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  EuiExpression,
  EuiToken,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPanel,
} from '@elastic/eui';
import styled from 'styled-components';
import type {
  EntryExists,
  EntryList,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
  EntryNested,
  ExceptionListItemSchema,
  NonEmptyNestedEntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ShowValueListModal } from '../../../../value_list/components/show_value_list_modal';

import * as i18n from './translations';
import { ValueWithSpaceWarning } from '../value_with_space_warning';

const OS_LABELS = Object.freeze({
  linux: i18n.OS_LINUX,
  mac: i18n.OS_MAC,
  macos: i18n.OS_MAC,
  windows: i18n.OS_WINDOWS,
});

const OPERATOR_TYPE_LABELS_INCLUDED = Object.freeze({
  [ListOperatorTypeEnum.NESTED]: i18n.CONDITION_OPERATOR_TYPE_NESTED,
  [ListOperatorTypeEnum.MATCH_ANY]: i18n.CONDITION_OPERATOR_TYPE_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: i18n.CONDITION_OPERATOR_TYPE_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: i18n.CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES,
  [ListOperatorTypeEnum.EXISTS]: i18n.CONDITION_OPERATOR_TYPE_EXISTS,
  [ListOperatorTypeEnum.LIST]: i18n.CONDITION_OPERATOR_TYPE_LIST,
});

const OPERATOR_TYPE_LABELS_EXCLUDED = Object.freeze({
  [ListOperatorTypeEnum.MATCH_ANY]: i18n.CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: i18n.CONDITION_OPERATOR_TYPE_NOT_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: i18n.CONDITION_OPERATOR_TYPE_WILDCARD_DOES_NOT_MATCH,
  [ListOperatorTypeEnum.EXISTS]: i18n.CONDITION_OPERATOR_TYPE_DOES_NOT_EXIST,
  [ListOperatorTypeEnum.LIST]: i18n.CONDITION_OPERATOR_TYPE_NOT_IN_LIST,
});

const EuiFlexGroupNested = styled(EuiFlexGroup)`
  margin-left: ${({ theme }) => theme.eui.euiSizeXL};
`;

const EuiFlexItemNested = styled(EuiFlexItem)`
  margin-bottom: 6px !important;
  margin-top: 6px !important;
`;

const StyledCondition = styled('span')`
  margin-right: 6px;
`;

const StyledConditionContent = styled(EuiPanel)`
  border: 1px;
  border-color: #d3dae6;
  border-style: solid;
`;

export interface CriteriaConditionsProps {
  entries: ExceptionListItemSchema['entries'];
  dataTestSubj: string;
  os?: ExceptionListItemSchema['os_types'];
}

export const ExceptionItemCardConditions = memo<CriteriaConditionsProps>(
  ({ os, entries, dataTestSubj }) => {
    const osLabel = useMemo(() => {
      if (os != null && os.length > 0) {
        return os
          .map((osValue) => OS_LABELS[osValue as keyof typeof OS_LABELS] ?? osValue)
          .join(', ');
      }

      return null;
    }, [os]);

    const getEntryValue = (type: string, value: string | string[] | undefined) => {
      if (type === 'match_any' && Array.isArray(value)) {
        return value.map((currentValue) => <EuiBadge color="hollow">{currentValue}</EuiBadge>);
      } else if (type === 'list' && value) {
        return (
          <ShowValueListModal shouldShowChildrenIfNoPermissions listId={value.toString()}>
            {value}
          </ShowValueListModal>
        );
      }
      return value ?? '';
    };

    const getEntryOperator = (type: string, operator: string) => {
      if (type === 'nested') return '';
      return operator === 'included'
        ? OPERATOR_TYPE_LABELS_INCLUDED[type as keyof typeof OPERATOR_TYPE_LABELS_INCLUDED] ?? type
        : OPERATOR_TYPE_LABELS_EXCLUDED[type as keyof typeof OPERATOR_TYPE_LABELS_EXCLUDED] ?? type;
    };

    const getNestedEntriesContent = useCallback(
      (type: string, nestedEntries: NonEmptyNestedEntriesArray) => {
        if (type === 'nested' && nestedEntries.length) {
          return nestedEntries.map((entry) => {
            const { field: nestedField, type: nestedType, operator: nestedOperator } = entry;
            const nestedValue = 'value' in entry ? entry.value : '';
            return (
              <EuiFlexGroupNested
                data-test-subj={`${dataTestSubj}-nestedCondition`}
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
                <ValueWithSpaceWarning value={nestedValue} />
              </EuiFlexGroupNested>
            );
          });
        }
      },
      [dataTestSubj]
    );

    const getValue = useCallback(
      (
        entry:
          | EntryExists
          | EntryList
          | EntryMatch
          | EntryMatchAny
          | EntryMatchWildcard
          | EntryNested
      ) => {
        if (entry.type === 'list') {
          return entry.list.id;
        } else {
          return 'value' in entry ? entry.value : '';
        }
      },
      []
    );

    return (
      <StyledConditionContent
        color="subdued"
        hasBorder={true}
        hasShadow={false}
        data-test-subj={dataTestSubj}
      >
        {osLabel != null && (
          <div data-test-subj={`${dataTestSubj}-os`}>
            <strong>
              <EuiExpression description={''} value={i18n.CONDITION_OS} />
              <EuiExpression description={i18n.CONDITION_OPERATOR_TYPE_MATCH} value={osLabel} />
            </strong>
          </div>
        )}
        {entries.map((entry, index) => {
          const { field, type } = entry;
          const value = getValue(entry);

          const nestedEntries = 'entries' in entry ? entry.entries : [];
          const operator = 'operator' in entry ? entry.operator : '';
          return (
            <div data-test-subj={`${dataTestSubj}-condition`} key={field + type + value + index}>
              <div className="eui-xScroll">
                <EuiExpression
                  description={
                    index === 0 ? '' : <StyledCondition>{i18n.CONDITION_AND}</StyledCondition>
                  }
                  value={field}
                  color={index === 0 ? 'primary' : 'subdued'}
                />
                <EuiExpression
                  description={getEntryOperator(type, operator)}
                  value={getEntryValue(type, value)}
                />
                <ValueWithSpaceWarning value={value} />
              </div>
              {nestedEntries != null && getNestedEntriesContent(type, nestedEntries)}
            </div>
          );
        })}
      </StyledConditionContent>
    );
  }
);
ExceptionItemCardConditions.displayName = 'ExceptionItemCardConditions';

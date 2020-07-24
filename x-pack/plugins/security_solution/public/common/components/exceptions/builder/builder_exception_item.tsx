/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { AndOrBadge } from '../../and_or_badge';
import { BuilderEntryItem } from './builder_entry_item';
import { getFormattedBuilderEntries, getUpdatedEntriesOnDelete } from './helpers';
import { FormattedBuilderEntry, ExceptionsBuilderExceptionItem, BuilderEntry } from '../types';
import { ExceptionListType } from '../../../../../public/lists_plugin_deps';

const MyInvisibleAndBadge = styled(EuiFlexItem)`
  visibility: hidden;
`;

const MyFirstRowContainer = styled(EuiFlexItem)`
  padding-top: 20px;
`;

const MyBeautifulLine = styled(EuiFlexItem)`
  &:after {
    background: ${({ theme }) => theme.eui.euiColorLightShade};
    content: '';
    width: 2px;
    height: 40px;
    margin: 0 15px;
  }
`;

interface ExceptionListItemProps {
  exceptionItem: ExceptionsBuilderExceptionItem;
  exceptionId: string;
  exceptionItemIndex: number;
  indexPattern: IIndexPattern;
  andLogicIncluded: boolean;
  isOnlyItem: boolean;
  listType: ExceptionListType;
  addNested: boolean;
  onDeleteExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  onChangeExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
}

export const ExceptionListItemComponent = React.memo<ExceptionListItemProps>(
  ({
    exceptionItem,
    exceptionId,
    exceptionItemIndex,
    indexPattern,
    isOnlyItem,
    listType,
    addNested,
    andLogicIncluded,
    onDeleteExceptionItem,
    onChangeExceptionItem,
  }) => {
    const handleEntryChange = useCallback(
      (entry: BuilderEntry, entryIndex: number): void => {
        const updatedEntries: BuilderEntry[] = [
          ...exceptionItem.entries.slice(0, entryIndex),
          { ...entry },
          ...exceptionItem.entries.slice(entryIndex + 1),
        ];
        const updatedExceptionItem: ExceptionsBuilderExceptionItem = {
          ...exceptionItem,
          entries: updatedEntries,
        };
        onChangeExceptionItem(updatedExceptionItem, exceptionItemIndex);
      },
      [onChangeExceptionItem, exceptionItem, exceptionItemIndex]
    );

    const handleDeleteEntry = useCallback(
      (entryIndex: number, parentIndex: number | null): void => {
        const updatedExceptionItem = getUpdatedEntriesOnDelete(
          exceptionItem,
          parentIndex ? parentIndex : entryIndex,
          parentIndex ? entryIndex : null
        );

        onDeleteExceptionItem(updatedExceptionItem, exceptionItemIndex);
      },
      [exceptionItem, onDeleteExceptionItem, exceptionItemIndex]
    );

    const entries = useMemo(
      (): FormattedBuilderEntry[] =>
        indexPattern != null && exceptionItem.entries.length > 0
          ? getFormattedBuilderEntries(indexPattern, exceptionItem.entries)
          : [],
      [exceptionItem.entries, indexPattern]
    );

    const getAndBadge = useCallback((): JSX.Element => {
      const badge = <AndOrBadge includeAntennas type="and" />;

      if (andLogicIncluded && exceptionItem.entries.length > 1 && exceptionItemIndex === 0) {
        return (
          <MyFirstRowContainer grow={false} data-test-subj="exceptionItemEntryFirstRowAndBadge">
            {badge}
          </MyFirstRowContainer>
        );
      } else if (andLogicIncluded && exceptionItem.entries.length <= 1) {
        return (
          <MyInvisibleAndBadge grow={false} data-test-subj="exceptionItemEntryInvisibleAndBadge">
            {badge}
          </MyInvisibleAndBadge>
        );
      } else if (andLogicIncluded && exceptionItem.entries.length > 1) {
        return (
          <EuiFlexItem grow={false} data-test-subj="exceptionItemEntryAndBadge">
            {badge}
          </EuiFlexItem>
        );
      } else {
        return <></>;
      }
    }, [exceptionItem.entries.length, exceptionItemIndex, andLogicIncluded]);

    const getDeleteButton = useCallback(
      (entryIndex: number, parentIndex: number | null): JSX.Element => {
        const button = (
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            onClick={() => handleDeleteEntry(entryIndex, parentIndex)}
            isDisabled={
              isOnlyItem &&
              exceptionItem.entries.length === 1 &&
              exceptionItemIndex === 0 &&
              (exceptionItem.entries[0].field == null || exceptionItem.entries[0].field === '')
            }
            aria-label="entryDeleteButton"
            className="exceptionItemEntryDeleteButton"
            data-test-subj="exceptionItemEntryDeleteButton"
          />
        );
        if (entryIndex === 0 && exceptionItemIndex === 0 && parentIndex == null) {
          return <MyFirstRowContainer grow={false}>{button}</MyFirstRowContainer>;
        } else {
          return <EuiFlexItem grow={false}>{button}</EuiFlexItem>;
        }
      },
      [exceptionItemIndex, exceptionItem.entries, handleDeleteEntry, isOnlyItem]
    );

    return (
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
          {getAndBadge()}
          <EuiFlexItem grow={6}>
            <EuiFlexGroup gutterSize="s" direction="column">
              {entries.map((item, index) => (
                <EuiFlexItem key={`${exceptionId}-${index}`} grow={1}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
                    {item.nested === 'child' && <MyBeautifulLine grow={false} />}
                    <EuiFlexItem grow={1}>
                      <BuilderEntryItem
                        entry={item}
                        indexPattern={indexPattern}
                        listType={listType}
                        addNested={addNested}
                        showLabel={
                          exceptionItemIndex === 0 && index === 0 && item.nested !== 'child'
                        }
                        onChange={handleEntryChange}
                      />
                    </EuiFlexItem>
                    {getDeleteButton(
                      item.entryIndex,
                      item.parent != null ? item.parent.parentIndex : null
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }
);

ExceptionListItemComponent.displayName = 'ExceptionListItem';

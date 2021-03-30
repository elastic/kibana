/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { HttpStart } from 'kibana/public';
import { AutocompleteStart } from 'src/plugins/data/public';

import { ExceptionListType } from '../../../../common';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';

import { BuilderEntry, ExceptionsBuilderExceptionItem, FormattedBuilderEntry } from './types';
import { BuilderAndBadgeComponent } from './and_badge';
import { BuilderEntryDeleteButtonComponent } from './entry_delete_button';
import { BuilderEntryItem } from './entry_renderer';
import { getFormattedBuilderEntries, getUpdatedEntriesOnDelete } from './helpers';

const MyBeautifulLine = styled(EuiFlexItem)`
  &:after {
    background: ${({ theme }): string => theme.eui.euiColorLightShade};
    content: '';
    width: 2px;
    height: 40px;
    margin: 0 15px;
  }
`;

const MyOverflowContainer = styled(EuiFlexItem)`
  overflow: hidden;
  width: 100%;
`;

interface BuilderExceptionListItemProps {
  allowLargeValueLists: boolean;
  httpService: HttpStart;
  autocompleteService: AutocompleteStart;
  exceptionItem: ExceptionsBuilderExceptionItem;
  exceptionItemIndex: number;
  indexPattern: IIndexPattern;
  andLogicIncluded: boolean;
  isOnlyItem: boolean;
  listType: ExceptionListType;
  onDeleteExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  onChangeExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  setErrorsExist: (arg: boolean) => void;
  onlyShowListOperators?: boolean;
}

export const BuilderExceptionListItemComponent = React.memo<BuilderExceptionListItemProps>(
  ({
    allowLargeValueLists,
    httpService,
    autocompleteService,
    exceptionItem,
    exceptionItemIndex,
    indexPattern,
    isOnlyItem,
    listType,
    andLogicIncluded,
    onDeleteExceptionItem,
    onChangeExceptionItem,
    setErrorsExist,
    onlyShowListOperators = false,
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
          entryIndex,
          parentIndex
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

    return (
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
          {andLogicIncluded && (
            <BuilderAndBadgeComponent
              entriesLength={exceptionItem.entries.length}
              exceptionItemIndex={exceptionItemIndex}
            />
          )}
          <MyOverflowContainer grow={6}>
            <EuiFlexGroup gutterSize="s" direction="column">
              {entries.map((item, index) => {
                const key = (item as typeof item & { id?: string }).id ?? `${index}`;
                return (
                  <EuiFlexItem key={key} grow={1}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
                      {item.nested === 'child' && <MyBeautifulLine grow={false} />}
                      <MyOverflowContainer grow={1}>
                        <BuilderEntryItem
                          allowLargeValueLists={allowLargeValueLists}
                          httpService={httpService}
                          autocompleteService={autocompleteService}
                          entry={item}
                          indexPattern={indexPattern}
                          listType={listType}
                          showLabel={
                            exceptionItemIndex === 0 && index === 0 && item.nested !== 'child'
                          }
                          onChange={handleEntryChange}
                          setErrorsExist={setErrorsExist}
                          onlyShowListOperators={onlyShowListOperators}
                        />
                      </MyOverflowContainer>
                      <BuilderEntryDeleteButtonComponent
                        entries={exceptionItem.entries}
                        isOnlyItem={isOnlyItem}
                        entryIndex={item.entryIndex}
                        exceptionItemIndex={exceptionItemIndex}
                        nestedParentIndex={item.parent != null ? item.parent.parentIndex : null}
                        onDelete={handleDeleteEntry}
                      />
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </MyOverflowContainer>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }
);

BuilderExceptionListItemComponent.displayName = 'BuilderExceptionListItem';

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
import type { AutocompleteStart } from 'src/plugins/data/public';
import { ExceptionListType, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import {
  BuilderEntry,
  ExceptionsBuilderExceptionItem,
  FormattedBuilderEntry,
  OperatorOption,
  getFormattedBuilderEntries,
  getUpdatedEntriesOnDelete,
} from '@kbn/securitysolution-list-utils';
import { DataViewBase } from '@kbn/es-query';

import { BuilderAndBadgeComponent } from './and_badge';
import { BuilderEntryDeleteButtonComponent } from './entry_delete_button';
import { BuilderEntryItem } from './entry_renderer';

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
  osTypes?: OsTypeArray;
  indexPattern: DataViewBase;
  andLogicIncluded: boolean;
  isOnlyItem: boolean;
  listType: ExceptionListType;
  listTypeSpecificIndexPatternFilter?: (
    pattern: DataViewBase,
    type: ExceptionListType,
    osTypes?: OsTypeArray
  ) => DataViewBase;
  onDeleteExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  onChangeExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  setErrorsExist: (arg: boolean) => void;
  setWarningsExist: (arg: boolean) => void;
  onlyShowListOperators?: boolean;
  isDisabled?: boolean;
  operatorsList?: OperatorOption[];
}

export const BuilderExceptionListItemComponent = React.memo<BuilderExceptionListItemProps>(
  ({
    allowLargeValueLists,
    httpService,
    autocompleteService,
    exceptionItem,
    osTypes,
    exceptionItemIndex,
    indexPattern,
    isOnlyItem,
    listType,
    listTypeSpecificIndexPatternFilter,
    andLogicIncluded,
    onDeleteExceptionItem,
    onChangeExceptionItem,
    setErrorsExist,
    setWarningsExist,
    onlyShowListOperators = false,
    isDisabled = false,
    operatorsList,
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
    const entries = useMemo((): FormattedBuilderEntry[] => {
      const hasIndexPatternAndEntries = indexPattern != null && exceptionItem.entries.length > 0;
      return hasIndexPatternAndEntries
        ? getFormattedBuilderEntries(indexPattern, exceptionItem.entries)
        : [];
    }, [exceptionItem.entries, indexPattern]);

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
                          autocompleteService={autocompleteService}
                          entry={item}
                          httpService={httpService}
                          indexPattern={indexPattern}
                          listType={listType}
                          listTypeSpecificIndexPatternFilter={listTypeSpecificIndexPatternFilter}
                          onChange={handleEntryChange}
                          onlyShowListOperators={onlyShowListOperators}
                          setErrorsExist={setErrorsExist}
                          setWarningsExist={setWarningsExist}
                          osTypes={osTypes}
                          isDisabled={isDisabled}
                          showLabel={
                            exceptionItemIndex === 0 && index === 0 && item.nested !== 'child'
                          }
                          operatorsList={operatorsList}
                        />
                      </MyOverflowContainer>
                      <BuilderEntryDeleteButtonComponent
                        entries={exceptionItem.entries}
                        entryIndex={item.entryIndex}
                        exceptionItemIndex={exceptionItemIndex}
                        isOnlyItem={isOnlyItem}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { HttpStart } from 'kibana/public';
import { addIdToItem } from '@kbn/securitysolution-utils';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListType,
  NamespaceType,
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
  OsTypeArray,
  entriesNested,
  exceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  CreateExceptionListItemBuilderSchema,
  ExceptionsBuilderExceptionItem,
  OperatorOption,
  containsValueListEntry,
  filterExceptionItems,
  getDefaultEmptyEntry,
  getDefaultNestedEmptyEntry,
  getNewExceptionItem,
} from '@kbn/securitysolution-list-utils';
import { DataViewBase } from '@kbn/es-query';

import type { AutocompleteStart } from '../../../../../../../src/plugins/unified_search/public';
import { AndOrBadge } from '../and_or_badge';

import { BuilderExceptionListItemComponent } from './exception_item_renderer';
import { BuilderLogicButtons } from './logic_buttons';
import { State, exceptionsBuilderReducer } from './reducer';

const MyInvisibleAndBadge = styled(EuiFlexItem)`
  visibility: hidden;
`;

const MyAndBadge = styled(AndOrBadge)`
  & > .euiFlexItem {
    margin: 0;
  }
`;

const MyButtonsContainer = styled(EuiFlexItem)`
  margin: 16px 0;
`;

const initialState: State = {
  addNested: false,
  andLogicIncluded: false,
  disableAnd: false,
  disableNested: false,
  disableOr: false,
  errorExists: 0,
  exceptions: [],
  exceptionsToDelete: [],
  warningExists: 0,
};

export interface OnChangeProps {
  errorExists: boolean;
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  exceptionsToDelete: ExceptionListItemSchema[];
  warningExists: boolean;
}

export interface ExceptionBuilderProps {
  allowLargeValueLists: boolean;
  autocompleteService: AutocompleteStart;
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  httpService: HttpStart;
  osTypes?: OsTypeArray;
  indexPatterns: DataViewBase;
  isAndDisabled: boolean;
  isNestedDisabled: boolean;
  isOrDisabled: boolean;
  isOrHidden?: boolean;
  listId: string;
  listNamespaceType: NamespaceType;
  listType: ExceptionListType;
  listTypeSpecificIndexPatternFilter?: (
    pattern: DataViewBase,
    type: ExceptionListType
  ) => DataViewBase;
  onChange: (arg: OnChangeProps) => void;
  ruleName: string;
  isDisabled?: boolean;
  operatorsList?: OperatorOption[];
}

export const ExceptionBuilderComponent = ({
  allowLargeValueLists,
  autocompleteService,
  exceptionListItems,
  httpService,
  indexPatterns,
  isAndDisabled,
  isNestedDisabled,
  isOrDisabled,
  isOrHidden = false,
  listId,
  listNamespaceType,
  listType,
  listTypeSpecificIndexPatternFilter,
  onChange,
  ruleName,
  isDisabled = false,
  osTypes,
  operatorsList,
}: ExceptionBuilderProps): JSX.Element => {
  const [
    {
      addNested,
      andLogicIncluded,
      disableAnd,
      disableNested,
      disableOr,
      errorExists,
      warningExists,
      exceptions,
      exceptionsToDelete,
    },
    dispatch,
  ] = useReducer(exceptionsBuilderReducer(), {
    ...initialState,
    disableAnd: isAndDisabled,
    disableNested: isNestedDisabled,
    disableOr: isOrDisabled,
  });

  const setErrorsExist = useCallback(
    (hasErrors: boolean): void => {
      dispatch({
        errorExists: hasErrors,
        type: 'setErrorsExist',
      });
    },
    [dispatch]
  );

  const setWarningsExist = useCallback(
    (hasWarnings: boolean): void => {
      dispatch({
        type: 'setWarningsExist',
        warningExists: hasWarnings,
      });
    },
    [dispatch]
  );

  const setUpdateExceptions = useCallback(
    (items: ExceptionsBuilderExceptionItem[]): void => {
      dispatch({
        exceptions: items,
        type: 'setExceptions',
      });
    },
    [dispatch]
  );

  const setDefaultExceptions = useCallback(
    (item: ExceptionsBuilderExceptionItem): void => {
      dispatch({
        initialState,
        lastException: item,
        type: 'setDefault',
      });
    },
    [dispatch]
  );

  const setUpdateExceptionsToDelete = useCallback(
    (items: ExceptionListItemSchema[]): void => {
      dispatch({
        exceptions: items,
        type: 'setExceptionsToDelete',
      });
    },
    [dispatch]
  );

  const setUpdateAndDisabled = useCallback(
    (shouldDisable: boolean): void => {
      dispatch({
        shouldDisable,
        type: 'setDisableAnd',
      });
    },
    [dispatch]
  );

  const setUpdateOrDisabled = useCallback(
    (shouldDisable: boolean): void => {
      dispatch({
        shouldDisable,
        type: 'setDisableOr',
      });
    },
    [dispatch]
  );

  const setUpdateAddNested = useCallback(
    (shouldAddNested: boolean): void => {
      dispatch({
        addNested: shouldAddNested,
        type: 'setAddNested',
      });
    },
    [dispatch]
  );

  const handleExceptionItemChange = useCallback(
    (item: ExceptionsBuilderExceptionItem, index: number): void => {
      const updatedExceptions = [
        ...exceptions.slice(0, index),
        {
          ...item,
        },
        ...exceptions.slice(index + 1),
      ];

      setUpdateExceptions(updatedExceptions);
    },
    [setUpdateExceptions, exceptions]
  );

  const handleDeleteExceptionItem = useCallback(
    (item: ExceptionsBuilderExceptionItem, itemIndex: number): void => {
      if (item.entries.length === 0) {
        const updatedExceptions = [
          ...exceptions.slice(0, itemIndex),
          ...exceptions.slice(itemIndex + 1),
        ];

        // if it's the only exception item left, don't delete it
        // just add a default entry to it
        if (updatedExceptions.length === 0) {
          setDefaultExceptions(item);
        } else if (updatedExceptions.length > 0 && exceptionListItemSchema.is(item)) {
          setUpdateExceptionsToDelete([...exceptionsToDelete, item]);
        } else {
          setUpdateExceptions([
            ...exceptions.slice(0, itemIndex),
            ...exceptions.slice(itemIndex + 1),
          ]);
        }
      } else {
        handleExceptionItemChange(item, itemIndex);
      }
    },
    [
      handleExceptionItemChange,
      setUpdateExceptions,
      setUpdateExceptionsToDelete,
      exceptions,
      exceptionsToDelete,
      setDefaultExceptions,
    ]
  );

  const handleAddNewExceptionItemEntry = useCallback(
    (isNested = false): void => {
      const lastException = exceptions[exceptions.length - 1];
      const { entries } = lastException;

      const updatedException: ExceptionsBuilderExceptionItem = {
        ...lastException,
        entries: [...entries, isNested ? getDefaultNestedEmptyEntry() : getDefaultEmptyEntry()],
      };

      setUpdateExceptions([...exceptions.slice(0, exceptions.length - 1), { ...updatedException }]);
    },
    [setUpdateExceptions, exceptions]
  );

  const handleAddNewExceptionItem = useCallback((): void => {
    // There is a case where there are numerous exception list items, all with
    // empty `entries` array. Thought about appending an entry item to one, but that
    // would then be arbitrary, decided to just create a new exception list item
    const newException = getNewExceptionItem({
      listId,
      namespaceType: listNamespaceType,
      ruleName,
    });
    setUpdateExceptions([...exceptions, { ...newException }]);
  }, [setUpdateExceptions, exceptions, listId, listNamespaceType, ruleName]);

  // The builder can have existing exception items, or new exception items that have yet
  // to be created (and thus lack an id), this was creating some React bugs with relying
  // on the index, as a result, created a temporary id when new exception items are first
  // instantiated that is stored in `meta` that gets stripped on it's way out
  const getExceptionListItemId = (item: ExceptionsBuilderExceptionItem, index: number): string => {
    if ((item as ExceptionListItemSchema).id != null) {
      return (item as ExceptionListItemSchema).id;
    } else if ((item as CreateExceptionListItemBuilderSchema).meta.temporaryUuid != null) {
      return (item as CreateExceptionListItemBuilderSchema).meta.temporaryUuid;
    } else {
      return `${index}`;
    }
  };

  const handleAddNestedExceptionItemEntry = useCallback((): void => {
    const lastException = exceptions[exceptions.length - 1];
    const { entries } = lastException;
    const lastEntry = entries[entries.length - 1];

    if (entriesNested.is(lastEntry)) {
      const updatedException: ExceptionsBuilderExceptionItem = {
        ...lastException,
        entries: [
          ...entries.slice(0, entries.length - 1),
          {
            ...lastEntry,
            entries: [
              ...lastEntry.entries,
              addIdToItem({
                field: '',
                operator: OperatorEnum.INCLUDED,
                type: OperatorTypeEnum.MATCH,
                value: '',
              }),
            ],
          },
        ],
      };

      setUpdateExceptions([...exceptions.slice(0, exceptions.length - 1), { ...updatedException }]);
    } else {
      setUpdateExceptions(exceptions);
    }
  }, [setUpdateExceptions, exceptions]);

  const handleAddNestedClick = useCallback((): void => {
    setUpdateAddNested(true);
    setUpdateOrDisabled(true);
    setUpdateAndDisabled(true);
    handleAddNewExceptionItemEntry(true);
  }, [
    handleAddNewExceptionItemEntry,
    setUpdateAndDisabled,
    setUpdateOrDisabled,
    setUpdateAddNested,
  ]);

  const handleAddClick = useCallback((): void => {
    setUpdateAddNested(false);
    setUpdateOrDisabled(false);
    handleAddNewExceptionItemEntry();
  }, [handleAddNewExceptionItemEntry, setUpdateOrDisabled, setUpdateAddNested]);

  // Bubble up changes to parent
  useEffect(() => {
    onChange({
      errorExists: errorExists > 0,
      exceptionItems: filterExceptionItems(exceptions),
      exceptionsToDelete,
      warningExists: warningExists > 0,
    });
  }, [onChange, exceptionsToDelete, exceptions, errorExists, warningExists]);

  useEffect(() => {
    setUpdateExceptions([]);
  }, [osTypes, setUpdateExceptions]);

  // Defaults builder to never be sans entry, instead
  // always falls back to an empty entry if user deletes all
  useEffect(() => {
    if (
      exceptions.length === 0 ||
      (exceptions.length === 1 &&
        exceptions[0].entries != null &&
        exceptions[0].entries.length === 0)
    ) {
      handleAddNewExceptionItem();
    }
  }, [exceptions, handleAddNewExceptionItem]);

  useEffect(() => {
    if (exceptionListItems.length > 0) {
      setUpdateExceptions(exceptionListItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiFlexGroup gutterSize="s" direction="column" data-test-subj="exceptionsBuilderWrapper">
      {exceptions.map((exceptionListItem, index) => (
        <EuiFlexItem grow={1} key={getExceptionListItemId(exceptionListItem, index)}>
          <EuiFlexGroup gutterSize="s" direction="column">
            {index !== 0 &&
              (andLogicIncluded ? (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="none" direction="row">
                    <MyInvisibleAndBadge grow={false}>
                      <MyAndBadge includeAntennas type="and" />
                    </MyInvisibleAndBadge>
                    <EuiFlexItem grow={false}>
                      <MyAndBadge type="or" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <MyAndBadge type="or" />
                </EuiFlexItem>
              ))}
            <EuiFlexItem grow={false}>
              <BuilderExceptionListItemComponent
                allowLargeValueLists={allowLargeValueLists}
                andLogicIncluded={andLogicIncluded}
                autocompleteService={autocompleteService}
                exceptionItem={exceptionListItem}
                exceptionItemIndex={index}
                httpService={httpService}
                indexPattern={indexPatterns}
                isOnlyItem={exceptions.length === 1}
                key={getExceptionListItemId(exceptionListItem, index)}
                listType={listType}
                listTypeSpecificIndexPatternFilter={listTypeSpecificIndexPatternFilter}
                onChangeExceptionItem={handleExceptionItemChange}
                onDeleteExceptionItem={handleDeleteExceptionItem}
                onlyShowListOperators={containsValueListEntry(exceptions)}
                setErrorsExist={setErrorsExist}
                setWarningsExist={setWarningsExist}
                osTypes={osTypes}
                isDisabled={isDisabled}
                operatorsList={operatorsList}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}

      <EuiSpacer size="m" />

      <MyButtonsContainer data-test-subj={`andOrOperatorButtons`}>
        <EuiFlexGroup gutterSize="s">
          {andLogicIncluded && (
            <MyInvisibleAndBadge grow={false}>
              <AndOrBadge includeAntennas type="and" />
            </MyInvisibleAndBadge>
          )}
          <EuiFlexItem grow={1}>
            <BuilderLogicButtons
              isOrDisabled={isOrDisabled ? isOrDisabled : disableOr}
              isOrHidden={isOrHidden}
              isAndDisabled={isAndDisabled ? isAndDisabled : disableAnd}
              isNestedDisabled={isNestedDisabled ? isNestedDisabled : disableNested}
              isNested={addNested}
              showNestedButton
              onOrClicked={handleAddNewExceptionItem}
              onAndClicked={handleAddClick}
              onNestedClicked={handleAddNestedClick}
              onAddClickWhenNested={handleAddNestedExceptionItemEntry}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MyButtonsContainer>
    </EuiFlexGroup>
  );
};

ExceptionBuilderComponent.displayName = 'ExceptionBuilder';

// eslint-disable-next-line import/no-default-export
export default ExceptionBuilderComponent;

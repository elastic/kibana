/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { HttpStart } from 'kibana/public';

import { addIdToItem } from '../../../../common/shared_imports';
import { AutocompleteStart, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListType,
  NamespaceType,
  OperatorEnum,
  OperatorTypeEnum,
  entriesNested,
  exceptionListItemSchema,
} from '../../../../common';
import { AndOrBadge } from '../and_or_badge';

import { CreateExceptionListItemBuilderSchema, ExceptionsBuilderExceptionItem } from './types';
import { BuilderExceptionListItemComponent } from './exception_item_renderer';
import { BuilderLogicButtons } from './logic_buttons';
import { State, exceptionsBuilderReducer } from './reducer';
import {
  containsValueListEntry,
  filterExceptionItems,
  getDefaultEmptyEntry,
  getDefaultNestedEmptyEntry,
  getNewExceptionItem,
} from './helpers';

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
};

export interface OnChangeProps {
  errorExists: boolean;
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  exceptionsToDelete: ExceptionListItemSchema[];
}

export interface ExceptionBuilderProps {
  allowLargeValueLists: boolean;
  autocompleteService: AutocompleteStart;
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  httpService: HttpStart;
  indexPatterns: IIndexPattern;
  isAndDisabled: boolean;
  isNestedDisabled: boolean;
  isOrDisabled: boolean;
  listId: string;
  listNamespaceType: NamespaceType;
  listType: ExceptionListType;
  listTypeSpecificIndexPatternFilter?: (
    pattern: IIndexPattern,
    type: ExceptionListType
  ) => IIndexPattern;
  onChange: (arg: OnChangeProps) => void;
  ruleName: string;
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
  listId,
  listNamespaceType,
  listType,
  listTypeSpecificIndexPatternFilter,
  onChange,
  ruleName,
}: ExceptionBuilderProps): JSX.Element => {
  const [
    {
      addNested,
      andLogicIncluded,
      disableAnd,
      disableNested,
      disableOr,
      errorExists,
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
    });
  }, [onChange, exceptionsToDelete, exceptions, errorExists]);

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
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}

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
              isAndDisabled={disableAnd}
              isNestedDisabled={disableNested}
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

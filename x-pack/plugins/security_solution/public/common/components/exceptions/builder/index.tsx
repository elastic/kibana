/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { ExceptionListItemComponent } from './builder_exception_item';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import {
  ExceptionListItemSchema,
  NamespaceType,
  exceptionListItemSchema,
  OperatorTypeEnum,
  OperatorEnum,
  CreateExceptionListItemSchema,
  ExceptionListType,
  entriesNested,
} from '../../../../../public/lists_plugin_deps';
import { AndOrBadge } from '../../and_or_badge';
import { BuilderButtonOptions } from './builder_button_options';
import { getNewExceptionItem, filterExceptionItems } from '../helpers';
import { ExceptionsBuilderExceptionItem, CreateExceptionListItemBuilderSchema } from '../types';
import { State, exceptionsBuilderReducer } from './reducer';
import {
  containsValueListEntry,
  getDefaultEmptyEntry,
  getDefaultNestedEmptyEntry,
} from './helpers';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import exceptionableFields from '../exceptionable_fields.json';

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
  disableAnd: false,
  disableNested: false,
  disableOr: false,
  andLogicIncluded: false,
  addNested: false,
  exceptions: [],
  exceptionsToDelete: [],
};

interface OnChangeProps {
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  exceptionsToDelete: ExceptionListItemSchema[];
}

interface ExceptionBuilderProps {
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  listType: ExceptionListType;
  listId: string;
  listNamespaceType: NamespaceType;
  ruleName: string;
  indexPatterns: IIndexPattern;
  isOrDisabled: boolean;
  isAndDisabled: boolean;
  isNestedDisabled: boolean;
  onChange: (arg: OnChangeProps) => void;
}

export const ExceptionBuilder = ({
  exceptionListItems,
  listType,
  listId,
  listNamespaceType,
  ruleName,
  indexPatterns,
  isOrDisabled,
  isAndDisabled,
  isNestedDisabled,
  onChange,
}: ExceptionBuilderProps) => {
  const [
    {
      exceptions,
      exceptionsToDelete,
      andLogicIncluded,
      disableAnd,
      disableNested,
      disableOr,
      addNested,
    },
    dispatch,
  ] = useReducer(exceptionsBuilderReducer(), {
    ...initialState,
    disableAnd: isAndDisabled,
    disableOr: isOrDisabled,
    disableNested: isNestedDisabled,
  });

  const setUpdateExceptions = useCallback(
    (items: ExceptionsBuilderExceptionItem[]): void => {
      dispatch({
        type: 'setExceptions',
        exceptions: items,
      });
    },
    [dispatch]
  );

  const setDefaultExceptions = useCallback(
    (item: ExceptionsBuilderExceptionItem): void => {
      dispatch({
        type: 'setDefault',
        initialState,
        lastException: item,
      });
    },
    [dispatch]
  );

  const setUpdateExceptionsToDelete = useCallback(
    (items: ExceptionListItemSchema[]): void => {
      dispatch({
        type: 'setExceptionsToDelete',
        exceptions: items,
      });
    },
    [dispatch]
  );

  const setUpdateAndDisabled = useCallback(
    (shouldDisable: boolean): void => {
      dispatch({
        type: 'setDisableAnd',
        shouldDisable,
      });
    },
    [dispatch]
  );

  const setUpdateOrDisabled = useCallback(
    (shouldDisable: boolean): void => {
      dispatch({
        type: 'setDisableOr',
        shouldDisable,
      });
    },
    [dispatch]
  );

  const setUpdateAddNested = useCallback(
    (shouldAddNested: boolean): void => {
      dispatch({
        type: 'setAddNested',
        addNested: shouldAddNested,
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

      // setAndLogicIncluded(updatedException.entries.length > 1);

      setUpdateExceptions([...exceptions.slice(0, exceptions.length - 1), { ...updatedException }]);
    },
    [setUpdateExceptions, exceptions]
  );

  const handleAddNewExceptionItem = useCallback((): void => {
    // There is a case where there are numerous exception list items, all with
    // empty `entries` array. Thought about appending an entry item to one, but that
    // would then be arbitrary, decided to just create a new exception list item
    const newException = getNewExceptionItem({
      listType,
      listId,
      namespaceType: listNamespaceType,
      ruleName,
    });
    setUpdateExceptions([...exceptions, { ...newException }]);
  }, [setUpdateExceptions, exceptions, listType, listId, listNamespaceType, ruleName]);

  // Filters index pattern fields by exceptionable fields if list type is endpoint
  const filterIndexPatterns = useMemo((): IIndexPattern => {
    if (listType === 'endpoint') {
      return {
        ...indexPatterns,
        fields: indexPatterns.fields.filter(({ name }) => exceptionableFields.includes(name)),
      };
    }
    return indexPatterns;
  }, [indexPatterns, listType]);

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
              {
                field: '',
                type: OperatorTypeEnum.MATCH,
                operator: OperatorEnum.INCLUDED,
                value: '',
              },
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
    onChange({ exceptionItems: filterExceptionItems(exceptions), exceptionsToDelete });
  }, [onChange, exceptionsToDelete, exceptions]);

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
    <EuiFlexGroup gutterSize="s" direction="column">
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
              <ExceptionListItemComponent
                key={getExceptionListItemId(exceptionListItem, index)}
                exceptionItem={exceptionListItem}
                exceptionId={getExceptionListItemId(exceptionListItem, index)}
                indexPattern={filterIndexPatterns}
                listType={listType}
                addNested={addNested}
                exceptionItemIndex={index}
                andLogicIncluded={andLogicIncluded}
                isOnlyItem={exceptions.length === 1}
                onDeleteExceptionItem={handleDeleteExceptionItem}
                onChangeExceptionItem={handleExceptionItemChange}
                onlyShowListOperators={containsValueListEntry(exceptions)}
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
            <BuilderButtonOptions
              isOrDisabled={disableOr}
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

ExceptionBuilder.displayName = 'ExceptionBuilder';

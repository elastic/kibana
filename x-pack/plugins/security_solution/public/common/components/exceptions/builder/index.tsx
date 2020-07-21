/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
} from '../../../../../public/lists_plugin_deps';
import { AndOrBadge } from '../../and_or_badge';
import { BuilderButtonOptions } from './builder_button_options';
import { getNewExceptionItem, filterExceptionItems } from '../helpers';
import { ExceptionsBuilderExceptionItem, CreateExceptionListItemBuilderSchema } from '../types';
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
  onChange,
}: ExceptionBuilderProps) => {
  const [andLogicIncluded, setAndLogicIncluded] = useState<boolean>(false);
  const [exceptions, setExceptions] = useState<ExceptionsBuilderExceptionItem[]>(
    exceptionListItems
  );
  const [exceptionsToDelete, setExceptionsToDelete] = useState<ExceptionListItemSchema[]>([]);

  const handleCheckAndLogic = (items: ExceptionsBuilderExceptionItem[]): void => {
    setAndLogicIncluded(items.filter(({ entries }) => entries.length > 1).length > 0);
  };

  const handleDeleteExceptionItem = (
    item: ExceptionsBuilderExceptionItem,
    itemIndex: number
  ): void => {
    if (item.entries.length === 0) {
      if (exceptionListItemSchema.is(item)) {
        setExceptionsToDelete((items) => [...items, item]);
      }

      setExceptions((existingExceptions) => {
        const updatedExceptions = [
          ...existingExceptions.slice(0, itemIndex),
          ...existingExceptions.slice(itemIndex + 1),
        ];
        handleCheckAndLogic(updatedExceptions);

        return updatedExceptions;
      });
    } else {
      handleExceptionItemChange(item, itemIndex);
    }
  };

  const handleExceptionItemChange = (item: ExceptionsBuilderExceptionItem, index: number): void => {
    const updatedExceptions = [
      ...exceptions.slice(0, index),
      {
        ...item,
      },
      ...exceptions.slice(index + 1),
    ];

    handleCheckAndLogic(updatedExceptions);
    setExceptions(updatedExceptions);
  };

  const handleAddNewExceptionItemEntry = useCallback((): void => {
    setExceptions((existingExceptions): ExceptionsBuilderExceptionItem[] => {
      const lastException = existingExceptions[existingExceptions.length - 1];
      const { entries } = lastException;
      const updatedException: ExceptionsBuilderExceptionItem = {
        ...lastException,
        entries: [
          ...entries,
          { field: '', type: OperatorTypeEnum.MATCH, operator: OperatorEnum.INCLUDED, value: '' },
        ],
      };

      setAndLogicIncluded(updatedException.entries.length > 1);

      return [
        ...existingExceptions.slice(0, existingExceptions.length - 1),
        { ...updatedException },
      ];
    });
  }, [setExceptions, setAndLogicIncluded]);

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
    setExceptions((existingExceptions) => [...existingExceptions, { ...newException }]);
  }, [setExceptions, listType, listId, listNamespaceType, ruleName]);

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
                isLoading={indexPatterns.fields.length === 0}
                exceptionItemIndex={index}
                andLogicIncluded={andLogicIncluded}
                isOnlyItem={exceptions.length === 1}
                onDeleteExceptionItem={handleDeleteExceptionItem}
                onChangeExceptionItem={handleExceptionItemChange}
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
              isOrDisabled={isOrDisabled}
              isAndDisabled={isAndDisabled}
              showNestedButton={false}
              onOrClicked={handleAddNewExceptionItem}
              onAndClicked={handleAddNewExceptionItemEntry}
              onNestedClicked={() => {}}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MyButtonsContainer>
    </EuiFlexGroup>
  );
};

ExceptionBuilder.displayName = 'ExceptionBuilder';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  EuiButtonIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopoverProps,
} from '@elastic/eui';
import type { Query } from 'src/plugins/data/public';
import { GenericIndexPatternColumn, operationDefinitionMap } from '../operations';
import { validateQuery } from '../operations/definitions/filters';
import { QueryInput } from '../query_input';
import type { IndexPattern, IndexPatternLayer } from '../types';

const filterByLabel = i18n.translate('xpack.lens.indexPattern.filterBy.label', {
  defaultMessage: 'Filter by',
});

// to do: get the language from uiSettings
export const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export function setFilter(columnId: string, layer: IndexPatternLayer, query: Query | undefined) {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        filter: query,
      },
    },
  };
}

export function Filtering({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
  isInitiallyOpen,
}: {
  selectedColumn: GenericIndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  isInitiallyOpen: boolean;
}) {
  const inputFilter = selectedColumn.filter;
  const [queryInput, setQueryInput] = useState(inputFilter ?? defaultFilter);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(isInitiallyOpen);

  useEffect(() => {
    const { isValid } = validateQuery(queryInput, indexPattern);

    if (isValid && !isEqual(inputFilter, queryInput)) {
      updateLayer(setFilter(columnId, layer, queryInput));
    }
  }, [columnId, layer, queryInput, indexPattern, updateLayer, inputFilter]);

  const onClosePopup: EuiPopoverProps['closePopover'] = useCallback(() => {
    setFilterPopoverOpen(false);
    if (inputFilter) {
      setQueryInput(inputFilter);
    }
  }, [inputFilter]);

  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];

  if (!selectedOperation.filterable || !inputFilter) {
    return null;
  }

  const { isValid: isInputFilterValid } = validateQuery(inputFilter, indexPattern);
  const { isValid: isQueryInputValid, error: queryInputError } = validateQuery(
    queryInput,
    indexPattern
  );

  return (
    <EuiFormRow
      display="columnCompressed"
      label={filterByLabel}
      fullWidth
      isInvalid={!isInputFilterValid}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiPopover
            isOpen={filterPopoverOpen}
            closePopover={onClosePopup}
            anchorClassName="eui-fullWidth"
            panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
            button={
              <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <EuiLink
                      className="lnsFiltersOperation__popoverButton"
                      data-test-subj="indexPattern-filters-existingFilterTrigger"
                      onClick={() => {
                        setFilterPopoverOpen(!filterPopoverOpen);
                      }}
                      color={isInputFilterValid ? 'text' : 'danger'}
                      title={i18n.translate('xpack.lens.indexPattern.filterBy.clickToEdit', {
                        defaultMessage: 'Click to edit',
                      })}
                    >
                      {inputFilter.query ||
                        i18n.translate('xpack.lens.indexPattern.filterBy.emptyFilterQuery', {
                          defaultMessage: '(empty)',
                        })}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      data-test-subj="indexPattern-filter-by-remove"
                      color="danger"
                      aria-label={i18n.translate('xpack.lens.filterBy.removeLabel', {
                        defaultMessage: 'Remove filter',
                      })}
                      onClick={() => {
                        updateLayer(setFilter(columnId, layer, undefined));
                      }}
                      iconType="cross"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            }
          >
            <EuiFormRow
              label={filterByLabel}
              isInvalid={!isQueryInputValid}
              error={queryInputError}
              fullWidth={true}
            >
              <QueryInput
                indexPatternTitle={indexPattern.title}
                data-test-subj="indexPattern-filter-by-input"
                value={queryInput}
                onChange={setQueryInput}
                isInvalid={!isQueryInputValid}
                onSubmit={() => {}}
              />
            </EuiFormRow>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

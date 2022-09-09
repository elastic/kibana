/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopoverProps,
  EuiIconTip,
} from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import { GenericIndexPatternColumn, operationDefinitionMap } from '../operations';
import type { IndexPatternLayer } from '../types';
import { QueryInput, useDebouncedValue, validateQuery } from '../../shared_components';
import type { IndexPattern } from '../../types';

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
  helpMessage,
}: {
  selectedColumn: GenericIndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  helpMessage: string | null;
}) {
  const inputFilter = selectedColumn.filter;
  const onChange = useCallback(
    (query) => {
      const { isValid } = validateQuery(query, indexPattern);
      if (isValid && !isEqual(inputFilter, query)) {
        updateLayer(setFilter(columnId, layer, query));
      }
    },
    [columnId, indexPattern, inputFilter, layer, updateLayer]
  );
  const { inputValue: queryInput, handleInputChange: setQueryInput } = useDebouncedValue<Query>({
    value: inputFilter ?? defaultFilter,
    onChange,
  });
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const onClosePopup: EuiPopoverProps['closePopover'] = useCallback(() => {
    setFilterPopoverOpen(false);
    if (inputFilter) {
      setQueryInput(inputFilter);
    }
  }, [inputFilter, setQueryInput]);

  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];

  if (!selectedOperation.filterable) {
    return null;
  }

  const { isValid: isInputFilterValid } = validateQuery(inputFilter, indexPattern);
  const { isValid: isQueryInputValid, error: queryInputError } = validateQuery(
    queryInput,
    indexPattern
  );

  const labelNode = helpMessage ? (
    <>
      {filterByLabel}{' '}
      <EuiIconTip
        color="subdued"
        content={helpMessage}
        iconProps={{
          className: 'eui-alignTop',
        }}
        position="top"
        size="s"
        type="questionInCircle"
      />
    </>
  ) : (
    filterByLabel
  );

  return (
    <EuiFormRow display="rowCompressed" label={labelNode} fullWidth isInvalid={!isInputFilterValid}>
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
                      {inputFilter?.query ||
                        i18n.translate('xpack.lens.indexPattern.filterBy.emptyFilterQuery', {
                          defaultMessage: '(empty)',
                        })}
                    </EuiLink>
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
              data-test-subj="indexPattern-filter-by-input"
            >
              <QueryInput
                indexPatternTitle={indexPattern.title}
                disableAutoFocus={true}
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

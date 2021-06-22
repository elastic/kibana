/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiLink, EuiPanel, EuiPopover } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Query } from 'src/plugins/data/public';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';
import { isQueryValid } from '../operations/definitions/filters';
import { QueryInput } from '../query_input';
import { IndexPattern, IndexPatternLayer } from '../types';

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
  selectedColumn: IndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  isInitiallyOpen: boolean;
}) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(isInitiallyOpen);
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (!selectedOperation.filterable || !selectedColumn.filter) {
    return null;
  }

  const isInvalid = !isQueryValid(selectedColumn.filter, indexPattern);

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.indexPattern.filterBy.label', {
        defaultMessage: 'Filter by',
      })}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiPopover
            isOpen={filterPopoverOpen}
            closePopover={() => {
              setFilterPopoverOpen(false);
            }}
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
                      color={isInvalid ? 'danger' : 'text'}
                      title={i18n.translate('xpack.lens.indexPattern.filterBy.clickToEdit', {
                        defaultMessage: 'Click to edit',
                      })}
                    >
                      {selectedColumn.filter.query ||
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
            <QueryInput
              indexPatternTitle={indexPattern.title}
              data-test-subj="indexPattern-filter-by-input"
              value={selectedColumn.filter || defaultFilter}
              onChange={(newQuery) => {
                updateLayer(setFilter(columnId, layer, newQuery));
              }}
              isInvalid={false}
              onSubmit={() => {}}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

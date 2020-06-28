/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import {
  Entry,
  EntryNested,
  EntriesArray,
  ExceptionListItemSchema,
} from '../../../../../public/lists_plugin_deps';
import { BrowserFields } from '../../../containers/source';
import { AndOrBadge } from '../../and_or_badge';
import { EntryItem } from './entry_item';
import { getFormattedBuilderEntry } from '../helpers';
import { FormattedBuilderEntry } from '../types';

interface ExceptionListItemProps {
  exceptionItem: ExceptionListItemSchema;
  exceptionItemIndex: number;
  browserFields: BrowserFields;
  isLoading: boolean;
  indexPattern: IIndexPattern;
  onExceptionItemChange: (item: ExceptionListItemSchema, index: number) => void;
  onDeleteEntry: (index: number) => void;
}

export const ExceptionListItem = React.memo<ExceptionListItemProps>(
  ({
    exceptionItem,
    exceptionItemIndex,
    indexPattern,
    browserFields,
    isLoading,
    onExceptionItemChange,
    onDeleteEntry,
  }) => {
    const handleEntryChange = (
      { field, operator, value }: Partial<FormattedBuilderEntry>,
      entryIndex: number
    ) => {
      const fieldName = field != null ? field.name : '';
      const operatorSelected = operator != null ? operator.operator : 'included';
      const operatorType = operator != null ? operator.type : 'match';
      console.log(JSON.stringify(exceptionItem.entries.slice(0, entryIndex)));
      const updatedEntries: EntriesArray = [
        ...exceptionItem.entries.slice(0, entryIndex),
        { field: fieldName, operator: operatorSelected, type: operatorType, value },
        ...exceptionItem.entries.slice(entryIndex + 1),
      ];
      const updatedExceptionItem: ExceptionListItemSchema = {
        ...exceptionItem,
        entries: updatedEntries,
      };
      onExceptionItemChange(updatedExceptionItem, exceptionItemIndex);
    };

    return (
      <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
        <EuiFlexItem grow={false}>
          <AndOrBadge includeAntennas type="and" />
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <EuiFlexGroup gutterSize="s" direction="column">
            {exceptionItem.entries.map((item: Entry | EntryNested, index) => (
              <EuiFlexItem grow={1}>
                <EntryItem
                  entry={getFormattedBuilderEntry(browserFields, item)}
                  entryIndex={index}
                  indexPattern={indexPattern}
                  browserFields={browserFields}
                  showLabel={exceptionItemIndex === 0 && index === 0}
                  isLoading={isLoading}
                  onEntryChange={handleEntryChange}
                  onDeleteEntry={() => onDeleteEntry(index)}
                  data-test-subj="exceptionEntryItem"
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionListItem.displayName = 'ExceptionListItem';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import {
  Entry,
  EntryNested,
  EntriesArray,
  ExceptionListItemSchema,
} from '../../../../../public/lists_plugin_deps';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { AndOrBadge } from '../../and_or_badge';
import { EntryItemComponent } from './entry_item';
import { getFormattedBuilderEntry, getFormattedBuilderEntries } from '../helpers';
import { FormattedBuilderEntry } from '../types';

interface ExceptionListItemProps {
  exceptionItem: ExceptionListItemSchema;
  exceptionItemIndex: number;
  isLoading: boolean;
  indexPattern: IIndexPattern;
  onExceptionItemChange: (item: ExceptionListItemSchema, index: number) => void;
  onDeleteEntry: (index: number) => void;
}

export const ExceptionListItemComponent = React.memo<ExceptionListItemProps>(
  ({
    exceptionItem,
    exceptionItemIndex,
    indexPattern,
    isLoading,
    onExceptionItemChange,
    onDeleteEntry,
  }) => {
    const handleEntryChange = ({ field, operator, type, value }: Entry, entryIndex: number) => {
      const updatedEntries: EntriesArray = [
        ...exceptionItem.entries.slice(0, entryIndex),
        { field, operator, type, value },
        ...exceptionItem.entries.slice(entryIndex + 1),
      ];
      const updatedExceptionItem: ExceptionListItemSchema = {
        ...exceptionItem,
        entries: updatedEntries,
      };
      onExceptionItemChange(updatedExceptionItem, exceptionItemIndex);
    };

    const entries = useMemo(
      (): FormattedBuilderEntry[] =>
        indexPattern != null ? getFormattedBuilderEntries(indexPattern, exceptionItem.entries) : [],
      [indexPattern, exceptionItem.entries]
    );

    return (
      <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
        <EuiFlexItem grow={false}>
          <AndOrBadge includeAntennas type="and" />
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <EuiFlexGroup gutterSize="s" direction="column">
            {entries.map((item, index) => (
              <EuiFlexItem grow={1} key={`${exceptionItem.id}-${index}`}>
                <EntryItemComponent
                  entry={item}
                  entryIndex={index}
                  indexPattern={indexPattern}
                  showLabel={exceptionItemIndex === 0 && index === 0}
                  isLoading={isLoading}
                  onChange={handleEntryChange}
                  onDeleteEntry={() => onDeleteEntry(index)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionListItemComponent.displayName = 'ExceptionListItem';

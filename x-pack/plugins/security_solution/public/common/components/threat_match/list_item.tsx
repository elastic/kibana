/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import type { DataViewBase } from '@kbn/es-query';
import { getFormattedEntries, getUpdatedEntriesOnDelete } from './helpers';
import { FormattedEntry, ThreatMapEntries, Entry } from './types';
import { EntryItem } from './entry_item';
import { EntryDeleteButtonComponent } from './entry_delete_button';
import { AndBadgeComponent } from './and_badge';

const MyOverflowContainer = styled(EuiFlexItem)`
  overflow: hidden;
  width: 100%;
`;

interface ListItemProps {
  listItem: ThreatMapEntries;
  listItemIndex: number;
  indexPattern: DataViewBase;
  threatIndexPatterns: DataViewBase;
  andLogicIncluded: boolean;
  isOnlyItem: boolean;
  onDeleteEntryItem: (item: ThreatMapEntries, index: number) => void;
  onChangeEntryItem: (item: ThreatMapEntries, index: number) => void;
}

export const ListItemComponent = React.memo<ListItemProps>(
  ({
    listItem,
    listItemIndex,
    indexPattern,
    threatIndexPatterns,
    isOnlyItem,
    andLogicIncluded,
    onDeleteEntryItem,
    onChangeEntryItem,
  }) => {
    const handleEntryChange = useCallback(
      (entry: Entry, entryIndex: number): void => {
        const updatedEntries: Entry[] = [
          ...listItem.entries.slice(0, entryIndex),
          { ...entry },
          ...listItem.entries.slice(entryIndex + 1),
        ];
        const updatedEntryItem: ThreatMapEntries = {
          ...listItem,
          entries: updatedEntries,
        };
        onChangeEntryItem(updatedEntryItem, listItemIndex);
      },
      [onChangeEntryItem, listItem, listItemIndex]
    );

    const handleDeleteEntry = useCallback(
      (entryIndex: number): void => {
        const updatedEntryItem = getUpdatedEntriesOnDelete(listItem, entryIndex);

        onDeleteEntryItem(updatedEntryItem, listItemIndex);
      },
      [listItem, onDeleteEntryItem, listItemIndex]
    );

    const entries = useMemo(
      (): FormattedEntry[] =>
        indexPattern != null && listItem.entries.length > 0
          ? getFormattedEntries(indexPattern, threatIndexPatterns, listItem.entries)
          : [],
      [listItem.entries, indexPattern, threatIndexPatterns]
    );
    return (
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" data-test-subj="entriesContainer">
          {andLogicIncluded && (
            <AndBadgeComponent
              entriesLength={listItem.entries.length}
              entryItemIndex={listItemIndex}
            />
          )}
          <MyOverflowContainer grow={6}>
            <EuiFlexGroup gutterSize="s" direction="column">
              {entries.map((item, index) => (
                <EuiFlexItem key={item.id} grow={1}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
                    <MyOverflowContainer grow={1}>
                      <EntryItem
                        entry={item}
                        threatIndexPatterns={threatIndexPatterns}
                        indexPattern={indexPattern}
                        showLabel={listItemIndex === 0 && index === 0}
                        onChange={handleEntryChange}
                      />
                    </MyOverflowContainer>
                    <EntryDeleteButtonComponent
                      entries={listItem.entries}
                      isOnlyItem={isOnlyItem}
                      entryIndex={item.entryIndex}
                      itemIndex={listItemIndex}
                      onDelete={handleDeleteEntry}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </MyOverflowContainer>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }
);

ListItemComponent.displayName = 'ListItem';

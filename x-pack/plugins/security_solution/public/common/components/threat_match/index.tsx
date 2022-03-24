/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import type { DataViewBase } from '@kbn/es-query';
import { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { ListItemComponent } from './list_item';
import { AndOrBadge } from '../and_or_badge';
import { LogicButtons } from './logic_buttons';
import { ThreatMapEntries } from './types';
import { State, reducer } from './reducer';
import { getDefaultEmptyEntry, getNewItem, filterItems } from './helpers';

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
  andLogicIncluded: false,
  entries: [],
  entriesToDelete: [],
};

interface OnChangeProps {
  entryItems: ThreatMapping;
  entriesToDelete: ThreatMapEntries[];
}

interface ThreatMatchComponentProps {
  listItems: ThreatMapEntries[];
  indexPatterns: DataViewBase;
  threatIndexPatterns: DataViewBase;
  onChange: (arg: OnChangeProps) => void;
}

export const ThreatMatchComponent = ({
  listItems,
  indexPatterns,
  threatIndexPatterns,
  onChange,
}: ThreatMatchComponentProps) => {
  const [{ entries, entriesToDelete, andLogicIncluded }, dispatch] = useReducer(reducer(), {
    ...initialState,
  });

  const setUpdateEntries = useCallback(
    (items: ThreatMapEntries[]): void => {
      dispatch({
        type: 'setEntries',
        entries: items,
      });
    },
    [dispatch]
  );

  const setDefaultEntries = useCallback(
    (item: ThreatMapEntries): void => {
      dispatch({
        type: 'setDefault',
        initialState,
        lastEntry: item,
      });
    },
    [dispatch]
  );

  const handleEntryItemChange = useCallback(
    (item: ThreatMapEntries, index: number): void => {
      const updatedEntries = [
        ...entries.slice(0, index),
        {
          ...item,
        },
        ...entries.slice(index + 1),
      ];

      setUpdateEntries(updatedEntries);
    },
    [setUpdateEntries, entries]
  );

  const handleDeleteEntryItem = useCallback(
    (item: ThreatMapEntries, itemIndex: number): void => {
      if (item.entries.length === 0) {
        const updatedEntries = [...entries.slice(0, itemIndex), ...entries.slice(itemIndex + 1)];
        // if it's the only item left, don't delete it just add a default entry to it
        if (updatedEntries.length === 0) {
          setDefaultEntries(item);
        } else {
          setUpdateEntries([...entries.slice(0, itemIndex), ...entries.slice(itemIndex + 1)]);
        }
      } else {
        handleEntryItemChange(item, itemIndex);
      }
    },
    [handleEntryItemChange, setUpdateEntries, entries, setDefaultEntries]
  );

  const handleAddNewEntryItemEntry = useCallback((): void => {
    const lastEntry = entries[entries.length - 1];
    const { entries: innerEntries } = lastEntry;

    const updatedEntry: ThreatMapEntries = {
      ...lastEntry,
      entries: [...innerEntries, getDefaultEmptyEntry()],
    };

    setUpdateEntries([...entries.slice(0, entries.length - 1), { ...updatedEntry }]);
  }, [setUpdateEntries, entries]);

  const handleAddNewEntryItem = useCallback((): void => {
    // There is a case where there are numerous list items, all with
    // empty `entries` array.
    const newItem = getNewItem();
    setUpdateEntries([...entries, { ...newItem }]);
  }, [setUpdateEntries, entries]);

  const handleAddClick = useCallback((): void => {
    handleAddNewEntryItemEntry();
  }, [handleAddNewEntryItemEntry]);

  // Bubble up changes to parent
  useEffect(() => {
    onChange({ entryItems: filterItems(entries), entriesToDelete });
  }, [onChange, entriesToDelete, entries]);

  // Defaults to never be sans entry, instead
  // always falls back to an empty entry if user deletes all
  useEffect(() => {
    if (
      entries.length === 0 ||
      (entries.length === 1 && entries[0].entries != null && entries[0].entries.length === 0)
    ) {
      handleAddNewEntryItem();
    }
  }, [entries, handleAddNewEntryItem]);

  useEffect(() => {
    if (listItems.length > 0) {
      setUpdateEntries(listItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      {entries.map((entryListItem, index) => {
        const key = (entryListItem as typeof entryListItem & { id?: string }).id ?? `${index}`;
        return (
          <EuiFlexItem grow={1} key={key}>
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
                <ListItemComponent
                  key={key}
                  listItem={entryListItem}
                  indexPattern={indexPatterns}
                  threatIndexPatterns={threatIndexPatterns}
                  listItemIndex={index}
                  andLogicIncluded={andLogicIncluded}
                  isOnlyItem={entries.length === 1}
                  onDeleteEntryItem={handleDeleteEntryItem}
                  onChangeEntryItem={handleEntryItemChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}

      <MyButtonsContainer data-test-subj={'andOrOperatorButtons'}>
        <EuiFlexGroup gutterSize="s">
          {andLogicIncluded && (
            <MyInvisibleAndBadge grow={false}>
              <AndOrBadge includeAntennas type="and" />
            </MyInvisibleAndBadge>
          )}
          <EuiFlexItem grow={1}>
            <LogicButtons
              isOrDisabled={false}
              isAndDisabled={false}
              onOrClicked={handleAddNewEntryItem}
              onAndClicked={handleAddClick}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MyButtonsContainer>
    </EuiFlexGroup>
  );
};

ThreatMatchComponent.displayName = 'ThreatMatch';

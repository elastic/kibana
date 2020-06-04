/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';

import { EntryItem } from './entry_item';
import { AndOrBadge } from '../and_or_badge';
import { BrowserFields } from '../../containers/source';
import { ExceptionItem, ExceptionItemEntry } from './types';

const AndBadgeContainer = styled(EuiFlexItem)`
  &.andBadgeNotVisible {
    visibility: hidden;
  }
  .euiBadge {
    margin: 0;
  }
`;

interface ExceptionItemProps {
  exceptionItem: ExceptionItem;
  exceptionItemIndex: number;
  listType: string;
  browserFields: BrowserFields;
  isAndLogicIncluded: boolean;
  indexPatternLoading: boolean;
  idAria: string;
  onChange: (arg: ExceptionItem, index: number) => void;
  setAndLogicIncluded: (arg: boolean) => void;
  onDelete: (arg: ExceptionItem, index: number) => void;
}

export const ExceptionItemComponent = React.memo<ExceptionItemProps>(
  ({
    exceptionItem,
    exceptionItemIndex,
    listType,
    browserFields,
    isAndLogicIncluded,
    indexPatternLoading,
    onChange,
    setAndLogicIncluded,
    onDelete,
    idAria,
  }) => {
    useEffect(() => {
      if (exceptionItem.entries.length > 1) {
        setAndLogicIncluded(true);
      }
    }, [exceptionItem]);

    const onEntryChange = useCallback(
      (entry: ExceptionItemEntry, index: number) => {
        const { entries: existingEntries } = exceptionItem;
        const updatedEntries = [
          ...existingEntries.slice(0, index),
          { ...entry },
          ...existingEntries.slice(index + 1),
        ];
        const updatedExceptionItem = {
          ...exceptionItem,
          entries: updatedEntries,
        };
        onChange(updatedExceptionItem, exceptionItemIndex);
      },
      [exceptionItem, exceptionItemIndex]
    );

    const onDeleteEntry = useCallback(
      (index: number) => {
        const { entries: existingEntries } = exceptionItem;
        const updatedEntries = [
          ...existingEntries.slice(0, index),
          ...existingEntries.slice(index + 1),
        ];
        const updatedExceptionItem = {
          ...exceptionItem,
          entries: updatedEntries,
          _delete: existingEntries.length < 2,
        };

        onDelete(updatedExceptionItem, exceptionItemIndex);
      },
      [exceptionItem, exceptionItemIndex]
    );

    return (
      <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
        {isAndLogicIncluded && (
          <AndBadgeContainer
            className={`exceptionAndBadgeContainer ${
              exceptionItem.entries.length <= 1 ? 'andBadgeNotVisible' : ''
            }`}
            grow={false}
            data-test-subj="exceptionItemAndBadge"
          >
            <AndOrBadge includeAntenas type="and" />
          </AndBadgeContainer>
        )}
        <EuiFlexItem grow={6}>
          {exceptionItem.entries.map((entry, index) => (
            <EntryItem
              key={`exceptionItemEntry-${index}`}
              exceptionItemEntry={entry}
              exceptionItemIndex={exceptionItemIndex}
              listType={listType}
              entryIndex={index}
              browserFields={browserFields}
              indexPatternLoading={indexPatternLoading}
              isLastEntry={index === exceptionItem.entries.length - 1}
              onEntryUpdate={onEntryChange}
              onDeleteEntry={onDeleteEntry}
              idAria={idAria}
              data-test-subj="exceptionEntryItem"
            />
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionItemComponent.displayName = 'ExceptionItem';

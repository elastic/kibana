/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { AndOrBadge } from '../../and_or_badge';
import { EntryItemComponent } from './entry_item';
import { getFormattedBuilderEntries } from '../helpers';
import { FormattedBuilderEntry, ExceptionsBuilderExceptionItem, BuilderEntry } from '../types';

const MyInvisibleAndBadge = styled(EuiFlexItem)`
  visibility: hidden;
`;

const MyFirstRowContainer = styled(EuiFlexItem)`
  padding-top: 20px;
`;

interface ExceptionListItemProps {
  exceptionItem: ExceptionsBuilderExceptionItem;
  exceptionId: string;
  exceptionItemIndex: number;
  isLoading: boolean;
  indexPattern: IIndexPattern;
  andLogicIncluded: boolean;
  onCheckAndLogic: (item: ExceptionsBuilderExceptionItem[]) => void;
  onDeleteExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  onExceptionItemChange: (item: ExceptionsBuilderExceptionItem, index: number) => void;
}

export const ExceptionListItemComponent = React.memo<ExceptionListItemProps>(
  ({
    exceptionItem,
    exceptionId,
    exceptionItemIndex,
    indexPattern,
    isLoading,
    andLogicIncluded,
    onCheckAndLogic,
    onDeleteExceptionItem,
    onExceptionItemChange,
  }) => {
    const handleEntryChange = (entry: BuilderEntry, entryIndex: number): void => {
      const updatedEntries: BuilderEntry[] = [
        ...exceptionItem.entries.slice(0, entryIndex),
        { ...entry },
        ...exceptionItem.entries.slice(entryIndex + 1),
      ];
      const updatedExceptionItem: ExceptionsBuilderExceptionItem = {
        ...exceptionItem,
        entries: updatedEntries,
      };
      onExceptionItemChange(updatedExceptionItem, exceptionItemIndex);
    };

    const handleDeleteEntry = (entryIndex: number): void => {
      const updatedEntries: BuilderEntry[] = [
        ...exceptionItem.entries.slice(0, entryIndex),
        ...exceptionItem.entries.slice(entryIndex + 1),
      ];
      const updatedExceptionItem: ExceptionsBuilderExceptionItem = {
        ...exceptionItem,
        entries: updatedEntries,
      };

      onDeleteExceptionItem(updatedExceptionItem, exceptionItemIndex);
    };

    const entries = useMemo((): FormattedBuilderEntry[] => {
      onCheckAndLogic([exceptionItem]);
      return indexPattern != null
        ? getFormattedBuilderEntries(indexPattern, exceptionItem.entries)
        : [];
    }, [indexPattern, exceptionItem, onCheckAndLogic]);

    const andBadge = useMemo((): JSX.Element => {
      const badge = <AndOrBadge includeAntennas type="and" />;
      if (entries.length > 1 && exceptionItemIndex === 0) {
        return <MyFirstRowContainer grow={false}>{badge}</MyFirstRowContainer>;
      } else if (entries.length > 1) {
        return <EuiFlexItem grow={false}>{badge}</EuiFlexItem>;
      } else {
        return <MyInvisibleAndBadge grow={false}>{badge}</MyInvisibleAndBadge>;
      }
    }, [entries.length, exceptionItemIndex]);

    const getDeleteButton = (index: number): JSX.Element => {
      const button = (
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          onClick={() => handleDeleteEntry(index)}
          aria-label="entryDeleteButton"
          className="exceptionItemEntryDeleteButton"
          data-test-subj="exceptionItemEntryDeleteButton"
        />
      );
      if (index === 0 && exceptionItemIndex === 0) {
        return <MyFirstRowContainer grow={false}>{button}</MyFirstRowContainer>;
      } else {
        return <EuiFlexItem grow={false}>{button}</EuiFlexItem>;
      }
    };

    return (
      <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
        {andLogicIncluded && andBadge}
        <EuiFlexItem grow={6}>
          <EuiFlexGroup gutterSize="s" direction="column">
            {entries.map((item, index) => (
              <EuiFlexItem key={`${exceptionId}-${index}`} grow={1}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
                  <EuiFlexItem grow={1}>
                    <EntryItemComponent
                      entry={item}
                      entryIndex={index}
                      indexPattern={indexPattern}
                      showLabel={exceptionItemIndex === 0 && index === 0}
                      isLoading={isLoading}
                      onChange={handleEntryChange}
                    />
                  </EuiFlexItem>
                  {getDeleteButton(index)}
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionListItemComponent.displayName = 'ExceptionListItem';

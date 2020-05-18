/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';

import { EntryItem } from './entry_item';
import { AndOrBadge } from './and_or_badge';
import { BrowserFields } from '../common/containers/source';
import { ExceptionItem } from './types';

const AndBadgeContainer = styled(EuiFlexItem)`
  &.andBadgeFirstEntryItemContainer {
    padding-top: 22px;
  }
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
  onChange: (arg: ExceptionItem, index: number) => void;
  setAndLogicIncluded: (arg: boolean) => void;
}

export const ExceptionItemComponent = ({
  exceptionItem,
  exceptionItemIndex,
  listType,
  browserFields,
  isAndLogicIncluded,
  indexPatternLoading,
  onChange,
  setAndLogicIncluded,
}: ExceptionItemProps) => {
  useEffect(() => {
    if (exceptionItem.entries.length > 1) {
      setAndLogicIncluded(true);
    }
  }, [exceptionItem]);

  const onEntryChange = useCallback(
    (entry, index) => {
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

  return (
    <EuiFlexGroup gutterSize="none">
      {isAndLogicIncluded && (
        <AndBadgeContainer
          className={`${exceptionItemIndex === 0 ? 'andBadgeFirstEntryItemContainer' : ''} ${
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
            key={`${exceptionItem.id}-${entry.field}`}
            exceptionItemEntry={entry}
            exceptionItemIndex={exceptionItemIndex}
            listType={listType}
            entryIndex={index}
            browserFields={browserFields}
            indexPatternLoading={indexPatternLoading}
            isLastEntry={index === exceptionItem.entries.length - 1}
            onEntryUpdate={onEntryChange}
            onDeleteEntry={() => {}}
            data-test-subj="exceptionEntryItem"
          />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

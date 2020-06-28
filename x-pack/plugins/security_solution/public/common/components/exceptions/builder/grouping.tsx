/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { BrowserFields } from '../../../containers/source';
import { AndOrBadge } from '../../and_or_badge';
import { EntryItem } from './entry_item';
import { FormattedBuilderEntry } from '../types';

interface ExceptionsGroupingProps {
  entries: FormattedBuilderEntry[];
  browserFields: BrowserFields;
  isLoading: boolean;
  onDeleteEntry: (index: number) => void;
}

export const ExceptionsGrouping = React.memo<ExceptionsGroupingProps>(
  ({ entries, browserFields, isLoading, onDeleteEntry }) => {

    return (
      <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
        <EuiFlexItem grow={false}>
          <AndOrBadge includeAntennas type="and" />
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <EuiFlexGroup gutterSize="s" direction="column">
            <EuiFlexItem grow={1}>
              {entries.map((item, index) => (
                <EntryItem
                  entry={item}
                  browserFields={browserFields}
                  showLabel={index === 0}
                  isLoading={isLoading}
                  onDeleteEntry={() => onDeleteEntry(index)}
                  data-test-subj="exceptionEntryItem"
                />
              ))}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
);

ExceptionsGrouping.displayName = 'ExceptionsGrouping';

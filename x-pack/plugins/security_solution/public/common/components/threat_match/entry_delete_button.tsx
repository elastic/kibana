/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { Entry } from './types';

const MyFirstRowContainer = styled(EuiFlexItem)`
  padding-top: 20px;
`;

interface EntryDeleteButtonProps {
  entries: Entry[];
  isOnlyItem: boolean;
  entryIndex: number;
  itemIndex: number;
  onDelete: (item: number) => void;
}

export const EntryDeleteButtonComponent = React.memo<EntryDeleteButtonProps>(
  ({ entries, isOnlyItem, entryIndex, itemIndex, onDelete }) => {
    const isDisabled: boolean =
      isOnlyItem &&
      entries.length === 1 &&
      itemIndex === 0 &&
      (entries[0].field == null || entries[0].field === '');

    const handleDelete = useCallback((): void => {
      onDelete(entryIndex);
    }, [onDelete, entryIndex]);

    const button = (
      <EuiButtonIcon
        color="danger"
        iconType="trash"
        onClick={handleDelete}
        isDisabled={isDisabled}
        aria-label="entryDeleteButton"
        className="itemEntryDeleteButton"
        data-test-subj="itemEntryDeleteButton"
      />
    );

    if (entryIndex === 0 && itemIndex === 0) {
      // This logic was added to work around it including the field
      // labels in centering the delete icon for the first row
      return (
        <MyFirstRowContainer grow={false} data-test-subj="firstRowDeleteButton">
          {button}
        </MyFirstRowContainer>
      );
    } else {
      return (
        <EuiFlexItem grow={false} data-test-subj="deleteButton">
          {button}
        </EuiFlexItem>
      );
    }
  }
);

EntryDeleteButtonComponent.displayName = 'EntryDeleteButton';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import type { BuilderEntry } from '@kbn/securitysolution-list-utils';

const MyFirstRowContainer = styled(EuiFlexItem)`
  padding-top: 25px;
`;

interface BuilderEntryDeleteButtonProps {
  entries: BuilderEntry[];
  isOnlyItem: boolean;
  entryIndex: number;
  exceptionItemIndex: number;
  nestedParentIndex: number | null;
  onDelete: (item: number, parent: number | null) => void;
}

export const BuilderEntryDeleteButtonComponent = React.memo<BuilderEntryDeleteButtonProps>(
  ({ entries, nestedParentIndex, isOnlyItem, entryIndex, exceptionItemIndex, onDelete }) => {
    const isDisabled: boolean =
      isOnlyItem &&
      entries.length === 1 &&
      exceptionItemIndex === 0 &&
      (entries[0].field == null || entries[0].field === '');

    const handleDelete = useCallback((): void => {
      onDelete(entryIndex, nestedParentIndex);
    }, [onDelete, entryIndex, nestedParentIndex]);

    const button = (
      <EuiButtonIcon
        color="danger"
        iconType="trash"
        onClick={handleDelete}
        isDisabled={isDisabled}
        aria-label="entryDeleteButton"
        className="exceptionItemEntryDeleteButton"
        data-test-subj="builderItemEntryDeleteButton"
      />
    );

    if (entryIndex === 0 && exceptionItemIndex === 0 && nestedParentIndex == null) {
      // This logic was added to work around it including the field
      // labels in centering the delete icon for the first row
      return (
        <MyFirstRowContainer grow={false} data-test-subj="firstRowBuilderDeleteButton">
          {button}
        </MyFirstRowContainer>
      );
    } else {
      return (
        <EuiFlexItem grow={false} data-test-subj="builderDeleteButton">
          {button}
        </EuiFlexItem>
      );
    }
  }
);

BuilderEntryDeleteButtonComponent.displayName = 'BuilderEntryDeleteButton';

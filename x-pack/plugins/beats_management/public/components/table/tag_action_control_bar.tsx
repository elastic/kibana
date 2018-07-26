/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import React from 'react';

interface TagActionControlBarProps {
  isDeleteDisabled: boolean;
  onAddTag: any;
  onDeleteSelected: any;
  onSearchQueryChange: any;
}

export const TagActionControlBar: React.SFC<TagActionControlBarProps> = ({
  isDeleteDisabled,
  onAddTag,
  onDeleteSelected,
  onSearchQueryChange,
}) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={onAddTag}>Add Tag</EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton color="danger" isDisabled={isDeleteDisabled} onClick={onDeleteSelected}>
          Delete Tag
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSearchBar box={{ incremental: true }} onChange={onSearchQueryChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';
import { AddFile } from './add_file';

import * as i18n from './translations';

interface FilesUtilityBarProps {
  caseId: string;
  onSearch: (newSearch: string) => void;
}

const HiddenButtonGroup = styled(EuiButtonGroup)`
  display: none;
`;

const tableViewSelectedId = 'tableViewSelectedId';
const toggleButtonsIcons = [
  {
    id: 'thumbnailViewSelectedId',
    label: 'Thumbnail view',
    iconType: 'grid',
    isDisabled: true,
  },
  {
    id: tableViewSelectedId,
    label: 'Table view',
    iconType: 'editorUnorderedList',
  },
];

export const FilesUtilityBar = ({ caseId, onSearch }: FilesUtilityBarProps) => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <AddFile caseId={caseId} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
        <EuiFieldSearch
          fullWidth
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={onSearch}
          incremental={false}
          data-test-subj="case-detail-search-file"
        />
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        <HiddenButtonGroup
          legend="Text align"
          options={toggleButtonsIcons}
          idSelected={tableViewSelectedId}
          onChange={() => {}}
          isIconOnly
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

FilesUtilityBar.displayName = 'FilesUtilityBar';

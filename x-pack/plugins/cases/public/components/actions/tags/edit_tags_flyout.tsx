/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import { Case } from '../../../../common';
import { useGetTags } from '../../../containers/use_get_tags';
import { EditTagsSelectable } from './edit_tags_selectable';
import * as i18n from './translations';
import { TagsSelectionState } from './types';

interface Props {
  selectedCases: Case[];
  onClose: () => void;
  onSaveTags: (args: TagsSelectionState) => void;
}

const EditTagsFlyoutComponent: React.FC<Props> = ({ selectedCases, onClose, onSaveTags }) => {
  const { data: tags, isLoading } = useGetTags();

  const [tagsSelection, setTagsSelection] = useState<TagsSelectionState>({
    selectedTags: [],
    unSelectedTags: [],
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="cases-edit-tags-flyout"
      data-test-subj="cases-edit-tags-flyout"
      size="s"
      paddingSize="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 data-test-subj="cases-edit-tags-flyout-title">{i18n.EDIT_TAGS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EditTagsSelectable
          selectedCases={selectedCases}
          isLoading={isLoading}
          tags={tags ?? []}
          onChangeTags={setTagsSelection}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => onSaveTags(tagsSelection)} fill>
              {i18n.SAVE_SELECTION}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

EditTagsFlyoutComponent.displayName = 'EditTagsFlyout';

export const EditTagsFlyout = React.memo(EditTagsFlyoutComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  euiFullHeight,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { CasesUI } from '../../../../common';
import { useGetTags } from '../../../containers/use_get_tags';
import { EditTagsSelectable } from './edit_tags_selectable';
import * as i18n from './translations';
import type { ItemsSelectionState } from '../types';

interface Props {
  selectedCases: CasesUI;
  onClose: () => void;
  onSaveTags: (args: ItemsSelectionState) => void;
}

const FlyoutBodyCss = css`
  ${euiFullHeight()}

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
  }
`;

const EditTagsFlyoutComponent: React.FC<Props> = ({ selectedCases, onClose, onSaveTags }) => {
  const { data: tags, isLoading } = useGetTags();

  const [tagsSelection, setTagsSelection] = useState<ItemsSelectionState>({
    selectedItems: [],
    unSelectedItems: [],
  });

  const onSave = useCallback(() => onSaveTags(tagsSelection), [onSaveTags, tagsSelection]);

  const headerSubtitle =
    selectedCases.length > 1 ? i18n.SELECTED_CASES(selectedCases.length) : selectedCases[0].title;

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
        <EuiText color="subdued">
          <p>{headerSubtitle}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={FlyoutBodyCss}>
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <EditTagsSelectable
            selectedCases={selectedCases}
            isLoading={isLoading}
            tags={tags ?? []}
            onChangeTags={setTagsSelection}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="cases-edit-tags-flyout-cancel"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill data-test-subj="cases-edit-tags-flyout-submit">
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

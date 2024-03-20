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
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { CasesUI } from '../../../../common';
import { EditAssigneesSelectable } from './edit_assignees_selectable';
import * as i18n from './translations';
import type { ItemsSelectionState } from '../types';

interface Props {
  selectedCases: CasesUI;
  onClose: () => void;
  onSaveAssignees: (args: ItemsSelectionState) => void;
}

const FlyoutBodyCss = css`
  ${euiFullHeight()}

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
  }
`;

const EditAssigneesFlyoutComponent: React.FC<Props> = ({
  selectedCases,
  onClose,
  onSaveAssignees,
}) => {
  const [assigneesSelection, setAssigneesSelection] = useState<ItemsSelectionState>({
    selectedItems: [],
    unSelectedItems: [],
  });

  const onSave = useCallback(
    () => onSaveAssignees(assigneesSelection),
    [onSaveAssignees, assigneesSelection]
  );

  const headerSubtitle =
    selectedCases.length > 1 ? i18n.SELECTED_CASES(selectedCases.length) : selectedCases[0].title;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="cases-edit-assignees-flyout"
      data-test-subj="cases-edit-assignees-flyout"
      size="s"
      paddingSize="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 data-test-subj="cases-edit-assignees-flyout-title">{i18n.EDIT_ASSIGNEES}</h2>
        </EuiTitle>
        <EuiText color="subdued">
          <p>{headerSubtitle}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={FlyoutBodyCss}>
        <EditAssigneesSelectable
          selectedCases={selectedCases}
          onChangeAssignees={setAssigneesSelection}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="cases-edit-assignees-flyout-cancel"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill data-test-subj="cases-edit-assignees-flyout-submit">
              {i18n.SAVE_SELECTION}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

EditAssigneesFlyoutComponent.displayName = 'EditAssigneesFlyout';

export const EditAssigneesFlyout = React.memo(EditAssigneesFlyoutComponent);

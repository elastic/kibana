/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React from 'react';

import * as i18n from '../case_view/translations';

interface EditableMarkdownFooterProps {
  handleSaveAction: () => Promise<void>;
  handleCancelAction: () => void;
  isSaveDisabled: boolean;
}

const EditableMarkdownFooterComponent: React.FC<EditableMarkdownFooterProps> = ({
  handleSaveAction,
  handleCancelAction,
  isSaveDisabled,
}) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="editable-cancel-markdown"
          size="s"
          onClick={handleCancelAction}
          iconType="cross"
        >
          {i18n.CANCEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="editable-save-markdown"
          color="success"
          fill
          iconType="save"
          onClick={handleSaveAction}
          disabled={isSaveDisabled}
          size="s"
        >
          {i18n.SAVE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

EditableMarkdownFooterComponent.displayName = 'EditableMarkdownFooterComponent';

export const EditableMarkdownFooter = React.memo(EditableMarkdownFooterComponent);

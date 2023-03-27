/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React from 'react';

import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import * as i18n from '../case_view/translations';

interface UserActionMarkdownFooterProps {
  handleSaveAction: () => Promise<void>;
  handleCancelAction: () => void;
}

const UserActionMarkdownFooterComponent: React.FC<UserActionMarkdownFooterProps> = ({
  handleSaveAction,
  handleCancelAction,
}) => {
  const [{ content }] = useFormData<{ content: string }>({ watch: ['content'] });

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="user-action-cancel-markdown"
          size="s"
          onClick={handleCancelAction}
          iconType="cross"
        >
          {i18n.CANCEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="user-action-save-markdown"
          color="success"
          fill
          iconType="save"
          onClick={handleSaveAction}
          disabled={!content}
          size="s"
        >
          {i18n.SAVE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserActionMarkdownFooterComponent.displayName = 'UserActionMarkdownFooterComponent';

export const UserActionMarkdownFooter = React.memo(UserActionMarkdownFooterComponent);

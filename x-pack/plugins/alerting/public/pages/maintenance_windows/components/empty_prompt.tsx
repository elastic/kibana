/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import { DocLinks } from '@kbn/doc-links';
import * as i18n from '../translations';

interface EmptyPromptProps {
  onClickCreate: () => void;
  docLinks: DocLinks;
  showCreateButton?: boolean;
}

const emptyTitle = <h2>{i18n.EMPTY_PROMPT_TITLE}</h2>;
const emptyBody = <p>{i18n.EMPTY_PROMPT_DESCRIPTION}</p>;

export const EmptyPrompt = React.memo<EmptyPromptProps>(
  ({ onClickCreate, showCreateButton = true, docLinks }) => {
    const renderActions = useMemo(() => {
      if (showCreateButton) {
        return [
          <EuiButton key="create-action" fill onClick={onClickCreate}>
            {i18n.EMPTY_PROMPT_BUTTON}
          </EuiButton>,
          <EuiButtonEmpty
            key="documentation-button"
            target="_blank"
            href={docLinks.alerting.maintenanceWindows}
            iconType="help"
          >
            {i18n.EMPTY_PROMPT_DOCUMENTATION}
          </EuiButtonEmpty>,
        ];
      }
      return null;
    }, [showCreateButton, onClickCreate, docLinks]);

    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="mw-empty-prompt"
        title={emptyTitle}
        body={emptyBody}
        actions={renderActions}
      />
    );
  }
);
EmptyPrompt.displayName = 'EmptyPrompt';

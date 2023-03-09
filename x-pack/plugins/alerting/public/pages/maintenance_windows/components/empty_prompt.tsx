/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import * as i18n from '../translations';

interface EmptyPromptProps {
  onClickCreate: () => void;
  docLinks: DocLinksStart;
  showCreateButton?: boolean;
}

export const EmptyPrompt = React.memo<EmptyPromptProps>(
  ({ onClickCreate, showCreateButton = true, docLinks }) => {
    const renderActions = () => {
      if (showCreateButton) {
        return [
          <EuiButton key="create-action" fill onClick={onClickCreate}>
            {i18n.EMPTY_PROMPT_BUTTON}
          </EuiButton>,
          <EuiButtonEmpty
            key="documentation-button"
            target="_blank"
            href={docLinks.links.alerting.guide}
            iconType="help"
          >
            {i18n.EMPTY_PROMPT_DOCUMENTATION}
          </EuiButtonEmpty>,
        ];
      }
      return null;
    };

    return (
      <EuiPageTemplate.EmptyPrompt
        title={<h2>{i18n.EMPTY_PROMPT_TITLE}</h2>}
        body={<p>{i18n.EMPTY_PROMPT_DESCRIPTION}</p>}
        actions={renderActions()}
      />
    );
  }
);
EmptyPrompt.displayName = 'EmptyPrompt';

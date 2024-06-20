/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';

const panelContainerClassName = css`
  width: 330px;
`;

export function WelcomeMessageKnowledgeBaseSetupErrorPanel({
  onRetryInstall,
}: {
  onRetryInstall: () => void;
}) {
  return (
    <div
      className={panelContainerClassName}
      data-test-subj="observabilityAiAssistantWelcomeMessageKnowledgeBaseSetupErrorPanel"
    >
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiText color="subdued" size="xs">
          <EuiLink
            data-test-subj="observabilityAiAssistantWelcomeMessageKnowledgeBaseSetupErrorPanelRetryInstallingLink"
            onClick={onRetryInstall}
          >
            {i18n.translate(
              'xpack.observabilityAiAssistant.welcomeMessageKnowledgeBaseSetupErrorPanel.retryInstallingLinkLabel',
              { defaultMessage: 'Retry install knowledge base' }
            )}
          </EuiLink>
        </EuiText>
      </EuiPanel>
    </div>
  );
}

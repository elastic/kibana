/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import ctaImage from '../../assets/elastic_ai_assistant.png';

const container = css`
  height: 100%;
  padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium};
`;

export function SelectEntryPanel() {
  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        justifyContent="center"
        className={container}
      >
        <EuiImage src={ctaImage} alt="Elastic AI Assistant" size="m" />
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.observabilityAiAssistant.chatWelcomePanel.title', {
              defaultMessage: 'Select an entry',
            })}
          </h2>
        </EuiTitle>
        <EuiText color="subdued" textAlign="center">
          Select an entry from the knowledge base to edit or delete it.
        </EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

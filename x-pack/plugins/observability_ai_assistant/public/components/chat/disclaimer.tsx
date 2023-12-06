/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import ctaImage from '../../assets/elastic_ai_assistant.png';

export function Disclaimer() {
  return (
    <>
      <EuiImage src={ctaImage} alt="Elastic AI Assistant" size="m" />
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.observabilityAiAssistant.disclaimer.title', {
            defaultMessage: 'Welcome to the Elastic AI Assistant for Observability',
          })}
        </h2>
      </EuiTitle>
      <EuiText color="subdued" textAlign="center">
        {i18n.translate('xpack.observabilityAiAssistant.disclaimer.thisChatIsPoweredTextLabel', {
          defaultMessage:
            'This chat is powered by an integration with your LLM provider. LLMs are known to produce hallucinations. Elastic supports the configuration and connection to the LLM provider and to your Knowledge base, but is not responsible for the LLM responses.',
        })}
      </EuiText>
    </>
  );
}

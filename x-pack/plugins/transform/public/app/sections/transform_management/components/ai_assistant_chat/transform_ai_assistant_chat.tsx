/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { type Message, MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import { i18n } from '@kbn/i18n';
const explainProcessMessageTitle = i18n.translate('xpack.transform.aiAssistantFlyout.title', {
  defaultMessage: 'Use Elastic AI Assitant to create Transforms',
});

const helpCreateTransformCommand = i18n.translate('xpack.transform.aiAssistantFlyout.command', {
  defaultMessage: `You are a helpful assistant who's knowledgeable in Elasticsearch transforms. Introduce yourself to the user in one sentence, include that you can help them with creating Transforms.`,
});

const TransformElasticAssistantChat = ({ command = helpCreateTransformCommand }) => {
  const { observabilityAIAssistant } = useAppDependencies();
  const explainProcessMessages = useMemo<Message[] | undefined>(() => {
    if (!command) {
      return undefined;
    }
    const now = new Date().toISOString();
    return [
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: helpCreateTransformCommand,
        },
      },
    ];
  }, [command]);

  if (!observabilityAIAssistant) return null;
  const { ObservabilityAIAssistantContextualInsight } = observabilityAIAssistant;

  return (
    <>
      {ObservabilityAIAssistantContextualInsight && explainProcessMessages ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ObservabilityAIAssistantContextualInsight
                title={explainProcessMessageTitle}
                messages={explainProcessMessages}
              />
            </EuiFlexItem>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
};

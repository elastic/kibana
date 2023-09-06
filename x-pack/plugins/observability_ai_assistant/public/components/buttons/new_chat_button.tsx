/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function NewChatButton(props: React.ComponentProps<typeof EuiButton>) {
  return (
    <EuiButton
      data-test-subj="observabilityAiAssistantNewChatButton"
      fill
      iconType="discuss"
      {...props}
    >
      {i18n.translate('xpack.observabilityAiAssistant.newChatButton', {
        defaultMessage: 'New chat',
      })}
    </EuiButton>
  );
}

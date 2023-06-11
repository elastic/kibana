/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoPilotWithUiService } from '../../typings/co_pilot';

export function CoPilotCreateChatButton({
  fill,
  coPilot,
}: {
  fill?: boolean;
  coPilot: CoPilotWithUiService;
}) {
  return (
    <EuiButton
      iconType="plusInCircle"
      data-test-subj="CoPilotChatButton"
      onClick={() => {
        coPilot.openNewConversation('');
      }}
      fill={fill}
    >
      {i18n.translate('xpack.observability.coPilotChat.startConversation', {
        defaultMessage: 'New chat',
      })}
    </EuiButton>
  );
}

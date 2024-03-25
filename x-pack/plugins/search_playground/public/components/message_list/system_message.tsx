/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiComment } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SystemMessageProps {
  content: React.ReactNode;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ content }) => {
  return (
    <EuiComment
      username={i18n.translate('xpack.searchPlayground.chat.message.system.username', {
        defaultMessage: 'system',
      })}
      timelineAvatarAriaLabel={i18n.translate(
        'xpack.searchPlayground.chat.message.system.avatarAriaLabel',
        {
          defaultMessage: 'System',
        }
      )}
      event={content}
      timelineAvatar="dot"
      eventColor="subdued"
    />
  );
};

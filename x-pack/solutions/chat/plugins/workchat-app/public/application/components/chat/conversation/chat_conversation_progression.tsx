/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTimelineItem, EuiLoadingElastic, EuiAvatar } from '@elastic/eui';
import type { ProgressionEvent } from '../../../../../common/chat_events';
import { FancyLoadingText } from '../../utilities/fancy_loading_text';

interface ChatConversationMessageProps {
  progressionEvents: ProgressionEvent[];
}

export const ChatConversationProgression: React.FC<ChatConversationMessageProps> = ({
  progressionEvents,
}) => {
  if (progressionEvents.length === 0) {
    return undefined;
  }

  const getText = (event: ProgressionEvent): string => {
    switch (event.data.step) {
      case 'planning':
        return 'Thinking about which tools to use';
      case 'retrieval':
        return 'Calling relevant tools';
      case 'analysis':
        return 'Analysing the results';
      case 'generate_summary':
        return 'Summarizing content';
      default:
        return 'Working';
    }
  };

  const lastEvent = progressionEvents[progressionEvents.length - 1];

  const icon = <EuiAvatar name="loading" color="plain" iconType={EuiLoadingElastic} />;

  return (
    <EuiTimelineItem icon={icon}>
      <FancyLoadingText text={getText(lastEvent)} />
    </EuiTimelineItem>
  );
};

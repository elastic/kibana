/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { getSummaryRows } from './get_alert_summary_rows';
import { useSecurityAssistantContext } from '../../../security_assistant/security_assistant_context';
import { SummaryView } from './summary_view';
import * as i18n from './translations';
import { getAutoRunPromptFromEventDetailsItem } from '../../../security_assistant/prompt/helpers';
import { getPromptContextFromEventDetailsItem } from '../../../security_assistant/prompt_context/helpers';
import { getUniquePromptContextId } from '../../../security_assistant/security_assistant_context/helpers';

const AlertSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  isDraggable?: boolean;
  scopeId: string;
  title: string;
  goToTable: () => void;
  isReadOnly?: boolean;
}> = ({ browserFields, data, eventId, isDraggable, scopeId, title, goToTable, isReadOnly }) => {
  const summaryRows = useMemo(
    () => getSummaryRows({ browserFields, data, eventId, isDraggable, scopeId, isReadOnly }),
    [browserFields, data, eventId, isDraggable, scopeId, isReadOnly]
  );

  const { registerPromptContext, unRegisterPromptContext } = useSecurityAssistantContext();
  const promptContextId = useMemo(() => getUniquePromptContextId(), []);

  const getPromptContext = useCallback(
    async () => getPromptContextFromEventDetailsItem(data),
    [data]
  );
  const getAutoRunPrompt = useCallback(
    async () => getAutoRunPromptFromEventDetailsItem(data),
    [data]
  );

  useEffect(() => {
    registerPromptContext({
      category: 'alert',
      description: i18n.ALERT_SUMMARY_VIEW_CONTEXT_DESCRIPTION,
      id: promptContextId,
      getPromptContext,
      getAutoRunPrompt,
      tooltip: i18n.ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
    });

    return () => unRegisterPromptContext(promptContextId);
  }, [
    getAutoRunPrompt,
    getPromptContext,
    promptContextId,
    registerPromptContext,
    unRegisterPromptContext,
  ]);

  return (
    <SummaryView
      goToTable={goToTable}
      isReadOnly={isReadOnly}
      promptContextId={promptContextId}
      rows={summaryRows}
      title={title}
    />
  );
};

export const AlertSummaryView = React.memo(AlertSummaryViewComponent);

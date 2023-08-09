/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { OverlayRef } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { createKibanaReactContext, useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ContextualInsight,
  MessageRole,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantProvider,
  useObservabilityAIAssistant,
  type Message,
} from '@kbn/observability-ai-assistant-plugin/public';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { LogViewReference } from '../../../../common/log_views';
import { TimeKey } from '../../../../common/time';
import { useLogEntry } from '../../../containers/logs/log_entry';
import { CenteredEuiFlyoutBody } from '../../centered_flyout_body';
import { DataSearchErrorCallout } from '../../data_search_error_callout';
import { DataSearchProgress } from '../../data_search_progress';
import { LogEntryActionsMenu } from './log_entry_actions_menu';
import { LogEntryFieldsTable } from './log_entry_fields_table';

const LOGS_SYSTEM_MESSAGE = {
  content: `You are logs-gpt, a helpful assistant for logs-based observability. Answer as
    concisely as possible.`,
  role: MessageRole.System,
};

export interface LogEntryFlyoutProps {
  logEntryId: string | null | undefined;
  onCloseFlyout: () => void;
  onSetFieldFilter?: (filter: Query, logEntryId: string, timeKey?: TimeKey) => void;
  logViewReference: LogViewReference | null | undefined;
}

export const useLogEntryFlyout = (logViewReference: LogViewReference) => {
  const flyoutRef = useRef<OverlayRef>();
  const {
    services: { http, data, uiSettings, application, observabilityAIAssistant },
    overlays: { openFlyout },
  } = useKibana<{
    data: DataPublicPluginStart;
    observabilityAIAssistant?: ObservabilityAIAssistantPluginStart;
  }>();

  const closeLogEntryFlyout = useCallback(() => {
    flyoutRef.current?.close();
  }, []);

  const openLogEntryFlyout = useCallback(
    (logEntryId) => {
      const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
        http,
        data,
        uiSettings,
        application,
      });

      flyoutRef.current = openFlyout(
        <KibanaReactContextProvider>
          <ObservabilityAIAssistantProvider value={observabilityAIAssistant}>
            <LogEntryFlyout
              logEntryId={logEntryId}
              onCloseFlyout={closeLogEntryFlyout}
              logViewReference={logViewReference}
            />
          </ObservabilityAIAssistantProvider>
        </KibanaReactContextProvider>
      );
    },
    [
      http,
      data,
      uiSettings,
      application,
      openFlyout,
      logViewReference,
      closeLogEntryFlyout,
      observabilityAIAssistant,
    ]
  );

  useEffect(() => {
    return () => {
      closeLogEntryFlyout();
    };
  }, [closeLogEntryFlyout]);

  return {
    openLogEntryFlyout,
    closeLogEntryFlyout,
  };
};

export const LogEntryFlyout = ({
  logEntryId,
  onCloseFlyout,
  onSetFieldFilter,
  logViewReference,
}: LogEntryFlyoutProps) => {
  const {
    cancelRequest: cancelLogEntryRequest,
    errors: logEntryErrors,
    fetchLogEntry,
    isRequestRunning,
    loaded: logEntryRequestProgress,
    logEntry,
    total: logEntryRequestTotal,
  } = useLogEntry({
    logViewReference,
    logEntryId,
  });

  useEffect(() => {
    if (logViewReference && logEntryId) {
      fetchLogEntry();
    }
  }, [fetchLogEntry, logViewReference, logEntryId]);

  const explainLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!logEntry) {
      return undefined;
    }

    const now = new Date().toISOString();

    return [
      {
        '@timestamp': now,
        message: LOGS_SYSTEM_MESSAGE,
      },
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: `I'm looking at a log entry. Can you explain me what the log message means? Where it could be coming from, whether it is expected and whether it is an issue. Here's the context, serialized: ${JSON.stringify(
            { logEntry: { fields: logEntry.fields } }
          )} `,
        },
      },
    ];
  }, [logEntry]);

  const similarLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!logEntry) {
      return undefined;
    }

    const now = new Date().toISOString();

    const message = logEntry.fields.find((field) => field.field === 'message')?.value[0];

    return [
      {
        '@timestamp': now,
        message: LOGS_SYSTEM_MESSAGE,
      },
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: `I'm looking at a log entry. Can you construct a Kibana KQL query that I can enter in the search bar that gives me similar log entries, based on the \`message\` field: ${message}`,
        },
      },
    ];
  }, [logEntry]);

  const aiAssistant = useObservabilityAIAssistant();

  return (
    <EuiFlyout onClose={onCloseFlyout} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="Details for log entry {logEntryId}"
                  id="xpack.logsShared.logFlyout.flyoutTitle"
                  values={{
                    logEntryId: logEntryId ? <code>{logEntryId}</code> : '',
                  }}
                />
              </h3>
            </EuiTitle>
            {logEntry ? (
              <>
                <EuiSpacer size="s" />
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.logsShared.logFlyout.flyoutSubTitle"
                    defaultMessage="From index {indexName}"
                    values={{
                      indexName: <code>{logEntry.index}</code>,
                    }}
                  />
                </EuiTextColor>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem style={{ padding: 8 }} grow={false}>
            {logEntry ? <LogEntryActionsMenu logEntry={logEntry} /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {isRequestRunning ? (
        <CenteredEuiFlyoutBody>
          <div style={{ width: '75%' }}>
            <DataSearchProgress
              label={loadingProgressMessage}
              maxValue={logEntryRequestTotal}
              onCancel={cancelLogEntryRequest}
              value={logEntryRequestProgress}
            />
          </div>
        </CenteredEuiFlyoutBody>
      ) : logEntry ? (
        <EuiFlyoutBody
          banner={
            (logEntryErrors?.length ?? 0) > 0 ? (
              <DataSearchErrorCallout
                title={loadingErrorCalloutTitle}
                errors={logEntryErrors ?? []}
                onRetry={fetchLogEntry}
              />
            ) : undefined
          }
        >
          <EuiFlexGroup direction="column" gutterSize="m">
            {aiAssistant.isEnabled() && explainLogMessageMessages ? (
              <EuiFlexItem grow={false}>
                <ContextualInsight
                  title={explainLogMessageTitle}
                  messages={explainLogMessageMessages}
                />
              </EuiFlexItem>
            ) : null}
            {aiAssistant.isEnabled() && similarLogMessageMessages ? (
              <EuiFlexItem grow={false}>
                <ContextualInsight
                  title={similarLogMessagesTitle}
                  messages={similarLogMessageMessages}
                />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <LogEntryFieldsTable logEntry={logEntry} onSetFieldFilter={onSetFieldFilter} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      ) : (
        <CenteredEuiFlyoutBody>
          <div style={{ width: '75%' }}>
            <DataSearchErrorCallout
              title={loadingErrorCalloutTitle}
              errors={logEntryErrors ?? []}
              onRetry={fetchLogEntry}
            />
          </div>
        </CenteredEuiFlyoutBody>
      )}
    </EuiFlyout>
  );
};

const explainLogMessageTitle = i18n.translate('xpack.logsShared.logFlyout.explainLogMessageTitle', {
  defaultMessage: "What's this message?",
});

const similarLogMessagesTitle = i18n.translate(
  'xpack.logsShared.logFlyout.similarLogMessagesTitle',
  {
    defaultMessage: 'How do I find similar log messages?',
  }
);

const loadingProgressMessage = i18n.translate('xpack.logsShared.logFlyout.loadingMessage', {
  defaultMessage: 'Searching log entry in shards',
});

const loadingErrorCalloutTitle = i18n.translate(
  'xpack.logsShared.logFlyout.loadingErrorCalloutTitle',
  {
    defaultMessage: 'Error while searching the log entry',
  }
);

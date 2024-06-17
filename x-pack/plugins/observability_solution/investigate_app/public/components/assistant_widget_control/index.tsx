/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  InvestigateWidgetCreate,
  InvestigationRevision,
} from '@kbn/investigate-plugin/public';
import type { Moment } from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { useKibana } from '../../hooks/use_kibana';
import { TimelineAskUpdateType } from '../../services/assistant/types';
import { ResizableTextInput } from '../resizable_text_input';

export function AssistantWidgetControlBase({
  prompt,
  onPromptChange,
  onSubmit,
  loading,
  error,
  status,
}: {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error?: Error;
  status?: string;
}) {
  const isError = !!error?.message;

  const displayedMessage = isError ? error.message : status;

  const icon = isError ? (
    <EuiIcon type="warning" color="danger" size="s" />
  ) : loading ? (
    <EuiLoadingSpinner size="s" />
  ) : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {displayedMessage ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color={isError ? 'danger' : 'subdued'}>
                {displayedMessage}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
          <EuiFlexItem grow>
            <ResizableTextInput
              placeholder={i18n.translate(
                'xpack.investigateApp.assistantWidgetControl.placeholder',
                {
                  defaultMessage: 'Send a message to the Assistant',
                }
              )}
              disabled={loading}
              value={prompt}
              onChange={(value) => {
                onPromptChange(value);
              }}
              onSubmit={() => {
                onSubmit();
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="investigateAppAssistantWidgetControlButton"
              aria-label={i18n.translate(
                'xpack.investigateApp.chatPromptEditor.euiButtonIcon.submitLabel',
                { defaultMessage: 'Submit' }
              )}
              disabled={loading || prompt.trim() === ''}
              display="base"
              iconType="kqlFunction"
              isLoading={loading}
              size="m"
              onClick={() => {
                onSubmit();
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function AssistantWidgetControl({
  onWidgetAdd,
  revision,
  start,
  end,
}: {
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
  revision: InvestigationRevision;
  start: Moment;
  end: Moment;
}) {
  const {
    notifications,
    dependencies: {
      start: { observabilityAIAssistant },
    },
    services: { assistant },
  } = useKibana();

  const connectors = observabilityAIAssistant.useGenAIConnectors();

  const [prompt, setPrompt] = useState('');

  const [loading, setLoading] = useState(false);

  const controllerRef = useRef(new AbortController());

  const [status, setStatus] = useState('');

  const [error, setError] = useState<Error>();

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.abort();
    };
  }, []);

  const subscriptionRef = useRef<Subscription>();

  const handleSubmit = () => {
    const signal = controllerRef.current.signal;
    setLoading(true);

    setStatus('');
    setError(undefined);

    setPrompt('');

    subscriptionRef.current = assistant
      .ask({
        revision,
        signal,
        connectorId: connectors.selectedConnector!,
        prompt,
        start,
        end,
      })
      .subscribe({
        next: (update) => {
          if (update.type === TimelineAskUpdateType.Status) {
            setStatus(update.status.message);
          }
          if (update.type === TimelineAskUpdateType.Widget) {
            onWidgetAdd(update.widget.create);
          }
        },
        error: (nextError) => {
          setError(() => nextError);
          notifications?.showErrorDialog({
            title: i18n.translate('xpack.investigateApp.assistantWidgetControl.unexpectedError', {
              defaultMessage: 'Unexpected error',
            }),
            error: nextError,
          });
          setLoading(false);
          setStatus('');
        },
        complete: () => {
          setStatus('');
          setLoading(false);
        },
      });
  };

  return (
    <AssistantWidgetControlBase
      loading={loading}
      prompt={prompt}
      error={error}
      status={status}
      onPromptChange={(nextPrompt) => {
        setPrompt(() => nextPrompt);
      }}
      onSubmit={() => {
        handleSubmit();
      }}
    />
  );
}

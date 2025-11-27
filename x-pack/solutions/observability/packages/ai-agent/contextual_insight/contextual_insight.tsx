/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiIcon,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiSkeletonText,
  EuiMarkdownFormat,
  useEuiTheme,
} from '@elastic/eui';
import { StartConversationButton } from './start_conversation_button';

export interface ContextualInsightProps {
  title: string;
  description?: string;
  content?: string;
  onStartConversation?: () => void;
  onOpen?: () => void;
  startButtonLabel?: string;
  isLoading?: boolean;
  error?: string;
  ['data-test-subj']?: string;
}

export function ContextualInsight({
  title,
  description,
  content,
  onStartConversation,
  onOpen,
  startButtonLabel,
  isLoading,
  error,
  'data-test-subj': dataTestSubj,
}: ContextualInsightProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
      <EuiAccordion
        id="aiAgentContextualInsight"
        arrowProps={{ css: { alignSelf: 'flex-start' } }}
        buttonContent={
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="m"
            alignItems="flex-start"
            data-test-subj={dataTestSubj}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon
                type="sparkles"
                color={euiTheme.colors.primary}
                style={{ marginTop: 6 }}
                size="l"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
                <h5>{title}</h5>
              </EuiText>
              <EuiText size="s" css={{ color: euiTheme.colors.textSubdued }}>
                <span>{description}</span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isLoading={false}
        isDisabled={false}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(open) => {
          setIsOpen(open);
          if (open && onOpen) {
            onOpen();
          }
        }}
      >
        <EuiSpacer size="m" />
        <EuiPanel hasBorder={false} hasShadow={false} color="subdued">
          {isLoading ? (
            <EuiSkeletonText lines={3} />
          ) : error ? (
            <EuiText size="s" color="danger">
              <p>{error}</p>
            </EuiText>
          ) : (
            <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat>
          )}
        </EuiPanel>

        {onStartConversation && Boolean(content && content.trim()) ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <StartConversationButton onClick={onStartConversation}>
                  {startButtonLabel}
                </StartConversationButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiAccordion>
    </EuiPanel>
  );
}

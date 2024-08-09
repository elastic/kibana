/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { AssistantAvatar } from '@kbn/observability-ai-assistant-plugin/public';
import { AuthenticatedUser } from '@kbn/core/public';
import { shade } from 'polished';
import { useTheme } from '../../hooks/use_theme';
import { InvestigateTextButton } from '../investigate_text_button';

const textContainerClassName = css`
  padding-top: 2px;
`;

const borderColor = shade(0.15);

export function TimelineMessage({
  icon,
  content,
  color,
  onDelete,
}: {
  icon: React.ReactNode;
  content: string;
  color: string;
  onDelete: () => void;
}) {
  const theme = useTheme();

  const panelClassName = css`
    background-color: ${color};
    border-radius: 16px;
    padding: 12px;
    border-width: 1px;
    border-color: ${borderColor(color)};
  `;

  const containerClassName = css`
    height: 100%;
    .euiButtonIcon {
      opacity: 0;
      transition: opacity ${theme.animation.fast} ${theme.animation.resistance};
    }
  `;
  return (
    <EuiPanel hasBorder className={panelClassName}>
      <EuiFlexGroup
        direction="row"
        gutterSize="m"
        alignItems="flexStart"
        className={containerClassName}
      >
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        <EuiFlexItem className={textContainerClassName}>
          <EuiText size="s" className={containerClassName}>
            <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <InvestigateTextButton
            data-test-subj="investigateAppTimelineMessageButton"
            iconType="trash"
            onClick={onDelete}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function TimelineUserPrompt({
  user,
  prompt,
  onDelete,
}: {
  user: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  prompt: string;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <TimelineMessage
      color={theme.colors.lightestShade}
      content={prompt}
      icon={<EuiAvatar name={user.full_name || user.username} size="m" />}
      onDelete={onDelete}
    />
  );
}

export function TimelineAssistantResponse({
  content,
  onDelete,
}: {
  content: string;
  onDelete: () => void;
}) {
  const theme = useTheme();

  const assistantAvatarContainer = css`
    border-radius: 32px;
    width: 32px;
    height: 32px;
    background: ${theme.colors.emptyShade};
    padding: 7px;
    border: 1px solid ${borderColor(theme.colors.highlight)};
  `;

  return (
    <TimelineMessage
      color={theme.colors.highlight}
      content={content}
      icon={
        <div className={assistantAvatarContainer}>
          <AssistantAvatar size="xs" />
        </div>
      }
      onDelete={onDelete}
    />
  );
}

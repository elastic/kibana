/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiMarkdownFormat, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { InvestigationNote } from '@kbn/investigate-plugin/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { format } from 'date-fns';
import React from 'react';
import { InvestigateTextButton } from '../../../../components/investigate_text_button';
import { useTheme } from '../../../../hooks/use_theme';

const textContainerClassName = css`
  padding-top: 2px;
`;

export function TimelineMessage({
  icon,
  note,
  onDelete,
}: {
  icon: React.ReactNode;
  note: InvestigationNote;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const timelineContainerClassName = css`
    padding-bottom: 16px;
    border-bottom: 1px solid ${theme.colors.lightShade};
    :last-child {
      border-bottom: 0px;
    }
  `;
  return (
    <EuiFlexGroup direction="column" gutterSize="s" className={timelineContainerClassName}>
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{format(new Date(note.createdAt), 'HH:mm')}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem grow={false}>
          <InvestigateTextButton
            data-test-subj="investigateAppTimelineMessageButton"
            iconType="trash"
            onClick={onDelete}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem className={textContainerClassName}>
        <EuiText size="s">
          <EuiMarkdownFormat textSize="s">{note.content}</EuiMarkdownFormat>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { InvestigationNoteResponse } from '@kbn/investigation-shared';
// eslint-disable-next-line import/no-extraneous-dependencies
import { formatDistance } from 'date-fns';
import React, { useState } from 'react';
import { useTheme } from '../../../../hooks/use_theme';
import { useInvestigation } from '../../contexts/investigation_context';
import { EditNoteForm } from './edit_note_form';

const textContainerClassName = css`
  padding-top: 2px;
`;

interface Props {
  note: InvestigationNoteResponse;
  disabled: boolean;
}

export function Note({ note, disabled }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const { deleteNote, isDeletingNote } = useInvestigation();

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
          <EuiFlexItem grow={false}>
            <EuiAvatar name={note.createdBy} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              {formatDistance(new Date(note.createdAt), new Date(), { addSuffix: true })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup
          direction="row"
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="editInvestigationNoteButton"
              size="s"
              iconSize="s"
              color="text"
              iconType="pencil"
              disabled={disabled || isDeletingNote}
              onClick={() => {
                setIsEditing(!isEditing);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconSize="s"
              color="text"
              iconType="trash"
              disabled={disabled || isDeletingNote}
              onClick={async () => await deleteNote(note.id)}
              data-test-subj="deleteInvestigationNoteButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiFlexItem className={textContainerClassName}>
        {isEditing ? (
          <EditNoteForm note={note} onClose={() => setIsEditing(false)} />
        ) : (
          <EuiText size="s">
            <EuiMarkdownFormat textSize="s">{note.content}</EuiMarkdownFormat>
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

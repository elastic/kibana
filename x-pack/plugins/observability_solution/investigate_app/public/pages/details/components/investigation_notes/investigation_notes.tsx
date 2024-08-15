/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { InvestigationNote } from '@kbn/investigate-plugin/common';
import { useTheme } from '../../../../hooks/use_theme';
import { ResizableTextInput } from './resizable_text_input';
import { TimelineMessage } from './timeline_message';
import { useAddInvestigationNote } from '../../../../hooks/use_add_investigation_note';
import { useDeleteInvestigationNote } from '../../../../hooks/use_delete_investigation_note';

export interface Props {
  investigationId: string;
  initialNotes: InvestigationNote[];
}

export function InvestigationNotes({ investigationId, initialNotes }: Props) {
  const theme = useTheme();
  const [notes, setNotes] = useState(initialNotes);
  const [note, setNote] = useState('');

  const { mutateAsync: addInvestigationNote, isLoading } = useAddInvestigationNote();
  const { mutateAsync: deleteInvestigationNote } = useDeleteInvestigationNote();

  function submit() {
    if (note.trim() === '') {
      return;
    }

    onAddNote(note.trim());
  }

  const onAddNote = async (content: string) => {
    const createdNote = await addInvestigationNote({ investigationId, note: { content } });
    setNotes(notes.concat(createdNote));
    setNote('');
  };

  const onDeleteNote = async (noteId: string) => {
    await deleteInvestigationNote({ investigationId, noteId });
    setNotes(notes.filter((currNote) => currNote.id !== noteId));
  };

  const panelClassName = css`
    background-color: ${theme.colors.lightShade};
  `;

  return (
    <EuiSplitPanel.Outer hasShadow={false} color="subdued">
      <EuiSplitPanel.Inner className={panelClassName}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.investigateApp.investigationNotes.investigationTimelineHeader', {
              defaultMessage: 'Investigation timeline',
            })}
          </h2>
        </EuiTitle>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="m">
          {notes.map((currNote: InvestigationNote) => {
            return (
              <TimelineMessage
                key={currNote.id}
                icon={<EuiAvatar name={currNote.createdBy} size="s" />}
                note={currNote}
                onDelete={() => onDeleteNote(currNote.id)}
              />
            );
          })}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.investigateApp.investigationNotes.euiFormRow.notesLabel', {
              defaultMessage: 'Notes',
            })}
          >
            <ResizableTextInput
              placeholder={i18n.translate('xpack.investigateApp.investigationNotes.placeholder', {
                defaultMessage: 'Add a note to the investigation',
              })}
              disabled={isLoading}
              value={note}
              onChange={(value) => {
                setNote(value);
              }}
              onSubmit={() => {
                submit();
              }}
            />
          </EuiFormRow>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="investigateAppInvestigationNotesAddButton"
              fullWidth
              color="text"
              aria-label={i18n.translate('xpack.investigateApp.investigationNotes.addButtonLabel', {
                defaultMessage: 'Add',
              })}
              disabled={isLoading || note.trim() === ''}
              isLoading={isLoading}
              size="m"
              onClick={() => {
                submit();
              }}
            >
              {i18n.translate('xpack.investigateApp.investigationNotes.addButtonLabel', {
                defaultMessage: 'Add',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}

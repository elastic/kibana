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
import { InvestigationNote } from '@kbn/investigate-plugin/common';
import React, { useState } from 'react';
import { useAddInvestigationNote } from '../../../../hooks/use_add_investigation_note';
import { useDeleteInvestigationNote } from '../../../../hooks/use_delete_investigation_note';
import { useFetchInvestigationNotes } from '../../../../hooks/use_fetch_investigation_notes';
import { useTheme } from '../../../../hooks/use_theme';
import { ResizableTextInput } from './resizable_text_input';
import { TimelineMessage } from './timeline_message';

export interface Props {
  investigationId: string;
  initialNotes: InvestigationNote[];
}

export function InvestigationNotes({ investigationId, initialNotes }: Props) {
  const theme = useTheme();
  const [noteInput, setNoteInput] = useState('');

  const { data: notes, refetch } = useFetchInvestigationNotes({
    investigationId,
    initialNotes,
  });
  const { mutateAsync: addInvestigationNote, isLoading: isAdding } = useAddInvestigationNote();
  const { mutateAsync: deleteInvestigationNote, isLoading: isDeleting } =
    useDeleteInvestigationNote();

  const onAddNote = async (content: string) => {
    await addInvestigationNote({ investigationId, note: { content } });
    refetch();
    setNoteInput('');
  };

  const onDeleteNote = async (noteId: string) => {
    await deleteInvestigationNote({ investigationId, noteId });
    refetch();
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
          {notes?.map((currNote: InvestigationNote) => {
            return (
              <TimelineMessage
                key={currNote.id}
                icon={<EuiAvatar name={currNote.createdBy} size="s" />}
                note={currNote}
                onDelete={() => onDeleteNote(currNote.id)}
                isDeleting={isDeleting}
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
              disabled={isAdding}
              value={noteInput}
              onChange={(value) => {
                setNoteInput(value);
              }}
              onSubmit={() => {
                onAddNote(noteInput.trim());
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
              disabled={isAdding || noteInput.trim() === ''}
              isLoading={isAdding}
              size="m"
              onClick={() => {
                onAddNote(noteInput.trim());
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

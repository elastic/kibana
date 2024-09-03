/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationNoteResponse } from '@kbn/investigation-shared';
import React, { useState } from 'react';
import { ResizableTextInput } from './resizable_text_input';
import { useUpdateInvestigationNote } from '../../../../hooks/use_update_investigation_note';

interface Props {
  investigationId: string;
  note: InvestigationNoteResponse;
  onCancel: () => void;
  onUpdate: () => void;
}

export function EditNoteForm({ investigationId, note, onCancel, onUpdate }: Props) {
  const [noteInput, setNoteInput] = useState(note.content);
  const { mutateAsync: updateNote, isLoading: isUpdating } = useUpdateInvestigationNote();

  const handleUpdateNote = async () => {
    await updateNote({ investigationId, noteId: note.id, note: { content: noteInput.trim() } });
    onUpdate();
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <ResizableTextInput
          disabled={isUpdating}
          value={noteInput}
          onChange={(value) => {
            setNoteInput(value);
          }}
          onSubmit={() => {
            handleUpdateNote();
          }}
          placeholder={note.content}
        />
      </EuiFlexItem>

      <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            disabled={isUpdating}
            data-test-subj="cancelEditNoteButton"
            color="text"
            aria-label={i18n.translate(
              'xpack.investigateApp.investigationNotes.cancelEditButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
            size="m"
            onClick={() => onCancel()}
          >
            {i18n.translate('xpack.investigateApp.investigationNotes.cancelEditButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="updateNoteButton"
            color="primary"
            aria-label={i18n.translate(
              'xpack.investigateApp.investigationNotes.updateNoteButtonLabel',
              { defaultMessage: 'Update note' }
            )}
            disabled={isUpdating || noteInput.trim() === ''}
            isLoading={isUpdating}
            size="m"
            onClick={() => {
              handleUpdateNote();
            }}
          >
            {i18n.translate('xpack.investigateApp.investigationNotes.updateNoteButtonLabel', {
              defaultMessage: 'Update note',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

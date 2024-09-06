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
import { useInvestigation } from '../../contexts/investigation_context';

interface Props {
  note: InvestigationNoteResponse;
  onClose: () => void;
}

export function EditNoteForm({ note, onClose }: Props) {
  const [noteInput, setNoteInput] = useState(note.content);
  const { updateNote, isUpdatingNote } = useInvestigation();

  const onUpdate = async () => {
    await updateNote(note.id, noteInput.trim());
    onClose();
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <ResizableTextInput
          disabled={isUpdatingNote}
          value={noteInput}
          onChange={(value) => {
            setNoteInput(value);
          }}
          onSubmit={onUpdate}
          placeholder={note.content}
        />
      </EuiFlexItem>

      <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            disabled={isUpdatingNote}
            data-test-subj="cancelEditNoteButton"
            color="text"
            aria-label={i18n.translate(
              'xpack.investigateApp.investigationNotes.cancelEditButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
            size="m"
            onClick={() => onClose()}
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
            disabled={isUpdatingNote || noteInput.trim() === ''}
            isLoading={isUpdatingNote}
            size="m"
            onClick={onUpdate}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import React, { useState } from 'react';
import { createNoteWidget } from '../../widgets/note_widget/create_note_widget';
import { ResizableTextInput } from '../resizable_text_input';

interface NoteWidgetControlProps {
  user: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
}

export function NoteWidgetControl({ user, onWidgetAdd }: NoteWidgetControlProps) {
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);

  function submit() {
    setLoading(false);
    onWidgetAdd(
      createNoteWidget({
        title: note,
        parameters: {
          note,
          user: {
            username: user.username,
            full_name: user.full_name,
          },
        },
      })
    )
      .then(() => {
        setNote('');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <ResizableTextInput
          placeholder={i18n.translate('xpack.investigateApp.noteWidgetControl.placeholder', {
            defaultMessage: 'Add a note to the investigation',
          })}
          disabled={loading}
          value={note}
          onChange={(value) => {
            setNote(value);
          }}
          onSubmit={() => {
            submit();
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="investigateAppNoteWidgetControlButton"
          fullWidth
          color="text"
          aria-label={i18n.translate('xpack.investigateApp.noteWidgetControl.addButtonLabel', {
            defaultMessage: 'Add',
          })}
          disabled={loading || note.trim() === ''}
          isLoading={loading}
          size="m"
          onClick={() => {
            submit();
          }}
        >
          {i18n.translate('xpack.investigateApp.noteWidgetControl.addButtonLabel', {
            defaultMessage: 'Add',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

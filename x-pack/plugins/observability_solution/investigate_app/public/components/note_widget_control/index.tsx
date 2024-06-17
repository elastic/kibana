/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/core/public';
import { ResizableTextInput } from '../resizable_text_input';
import { createNoteWidget } from '../../widgets/note_widget/create_note_widget';

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
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
      <EuiFlexItem grow>
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
        <EuiButtonIcon
          data-test-subj="investigateAppNoteWidgetControlButton"
          aria-label={i18n.translate('xpack.investigateApp.noteWidgetControl.submitLabel', {
            defaultMessage: 'Submit',
          })}
          disabled={loading || note.trim() === ''}
          display="base"
          iconType="kqlFunction"
          isLoading={loading}
          size="m"
          onClick={() => {
            submit();
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

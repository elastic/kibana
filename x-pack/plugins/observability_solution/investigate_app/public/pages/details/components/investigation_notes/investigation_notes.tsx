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
import React from 'react';
import { useTheme } from '../../../../hooks/use_theme';
import { ResizableTextInput } from './resizable_text_input';
import { TimelineMessage } from './timeline_message';

export interface Props {
  notes: InvestigationNote[];
  addNote: (note: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export function InvestigationNotes({ notes, addNote, deleteNote }: Props) {
  const theme = useTheme();
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function submit() {
    if (note.trim() === '') {
      return;
    }

    setLoading(false);
    addNote(note)
      .then(() => {
        setNote('');
      })
      .finally(() => {
        setLoading(false);
      });
  }

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
                icon={<EuiAvatar name={currNote.createdBy.username} size="s" />}
                note={currNote}
                onDelete={() => deleteNote(currNote.id)}
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
              disabled={loading}
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
              disabled={loading || note.trim() === ''}
              isLoading={loading}
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

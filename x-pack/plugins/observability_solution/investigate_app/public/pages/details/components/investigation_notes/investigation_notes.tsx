/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { InvestigationNoteResponse } from '@kbn/investigation-shared';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import React, { useState } from 'react';
import { useFetchUserProfiles } from '../../../../hooks/use_fetch_user_profiles';
import { useTheme } from '../../../../hooks/use_theme';
import { useInvestigation } from '../../contexts/investigation_context';
import { Note } from './note';
import { ResizableTextInput } from './resizable_text_input';

export interface Props {
  user: AuthenticatedUser;
}

export function InvestigationNotes({ user }: Props) {
  const theme = useTheme();
  const { investigation, addNote, isAddingNote } = useInvestigation();
  const { data: userProfiles, isLoading: isLoadingUserProfiles } = useFetchUserProfiles({
    profileIds: new Set(investigation?.notes.map((note) => note.createdBy)),
  });

  const [noteInput, setNoteInput] = useState('');
  const onAddNote = async (content: string) => {
    await addNote(content);
    setNoteInput('');
  };

  const panelClassName = css`
    background-color: ${theme.colors.lightShade};
  `;

  return (
    <EuiSplitPanel.Outer hasShadow={false} color="subdued">
      <EuiSplitPanel.Inner className={panelClassName}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.investigateApp.investigationNotes.header', {
              defaultMessage: 'Notes',
            })}
          </h2>
        </EuiTitle>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="m">
          {investigation?.notes.map((currNote: InvestigationNoteResponse) => {
            return (
              <Note
                key={currNote.id}
                note={currNote}
                userProfile={userProfiles?.[currNote.createdBy]}
                userProfileLoading={isLoadingUserProfiles}
                isOwner={currNote.createdBy === user.profile_uid}
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
              disabled={isAddingNote}
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
              color="primary"
              aria-label={i18n.translate('xpack.investigateApp.investigationNotes.addButtonLabel', {
                defaultMessage: 'Add',
              })}
              disabled={isAddingNote || noteInput.trim() === ''}
              isLoading={isAddingNote}
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

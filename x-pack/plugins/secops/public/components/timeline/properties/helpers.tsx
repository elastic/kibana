/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiModal, EuiOverlayMask, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import uuid from 'uuid';

import { History } from '../../../lib/history';
import { Note } from '../../../lib/note';
import { Notes } from '../../notes';
import { AssociateNote, UpdateNote } from '../../notes/helpers';
import {
  ButtonContainer,
  DescriptionField,
  EmptyStar,
  Facet,
  HistoryButtonLabel,
  LabelText,
  NameField,
  NotesButtonLabel,
  StarSvg,
} from './styles';
import * as i18n from './translations';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateIsLive = ({ id, isLive }: { id: string; isLive: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;

// TODO: replace this svg with the same filled EuiIcon
const FilledStar = pure<{ starFill: string; starStroke: string }>(({ starFill, starStroke }) => (
  <StarSvg
    data-test-subj="timeline-star-svg"
    viewBox="0 35 120 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon
      fillRule="nonzero"
      fill={starFill}
      stroke={starStroke}
      points="50,0 21,90 98,35 2,35 79,90"
    />
  </StarSvg>
));

export const StarIcon = pure<{
  isFavorite: boolean;
  timelineId: string;
  updateIsFavorite: UpdateIsFavorite;
}>(({ isFavorite, timelineId: id, updateIsFavorite }) => (
  <div role="button" onClick={() => updateIsFavorite({ id, isFavorite: !isFavorite })}>
    {isFavorite ? (
      <EuiToolTip data-test-subj="timeline-favorite-filled-star-tool-tip" content="Favorite">
        <FilledStar
          data-test-subj="timeline-favorite-filled-star"
          starStroke="#E6C220"
          starFill="#E6C220"
        />
      </EuiToolTip>
    ) : (
      <EuiToolTip content="Not a favorite">
        <EmptyStar data-test-subj="timeline-favorite-empty-star" type="starEmpty" size="l" />
      </EuiToolTip>
    )}
  </div>
));

export const Description = pure<{
  description: string;
  timelineId: string;
  updateDescription: UpdateDescription;
}>(({ description, timelineId, updateDescription }) => (
  <EuiToolTip data-test-subj="timeline-description-tool-tip" content={i18n.DESCRIPTION_TOOL_TIP}>
    <DescriptionField
      aria-label={i18n.TIMELINE_DESCRIPTION}
      data-test-subj="timeline-description"
      onChange={e => updateDescription({ id: timelineId, description: e.target.value })}
      placeholder={i18n.DESCRIPTION}
      spellCheck={true}
      value={description}
    />
  </EuiToolTip>
));

export const Name = pure<{ timelineId: string; title: string; updateTitle: UpdateTitle }>(
  ({ timelineId, title, updateTitle }) => (
    <EuiToolTip data-test-subj="timeline-title-tool-tip" content="Title">
      <NameField
        aria-label={i18n.TIMELINE_TITLE}
        data-test-subj="timeline-title"
        onChange={e => updateTitle({ id: timelineId, title: e.target.value })}
        placeholder={i18n.UNTITLED_TIMELINE}
        spellCheck={true}
        value={title}
      />
    </EuiToolTip>
  )
);

export const NewTimeline = pure<{
  createTimeline: CreateTimeline;
  onClosePopover: () => void;
  timelineId: string;
}>(({ createTimeline, onClosePopover, timelineId }) => (
  <EuiToolTip data-test-subj="timeline-new-tool-tip" content={i18n.NEW_TIMELINE_TOOL_TIP}>
    <EuiButton
      data-test-subj="timeline-new"
      fill={true}
      onClick={() => {
        createTimeline({ id: timelineId, show: true });
        onClosePopover();
      }}
    >
      {i18n.NEW_TIMELINE}
    </EuiButton>
  </EuiToolTip>
));

interface NotesButtonProps {
  associateNote: AssociateNote;
  notes: Note[];
  showNotes: boolean;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

const getNewNoteId = (): string => uuid.v4();

export const NotesButton = pure<NotesButtonProps>(
  ({ associateNote, notes, showNotes, toggleShowNotes, updateNote }) => (
    <ButtonContainer>
      <EuiToolTip data-test-subj="timeline-notes-tool-tip" content={i18n.NOTES_TOOL_TIP}>
        <>
          <EuiButton
            data-test-subj="timeline-notes"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => toggleShowNotes()}
          >
            <NotesButtonLabel>
              <Facet>{notes.length}</Facet>
              <LabelText>Notes</LabelText>
            </NotesButtonLabel>
          </EuiButton>
          {showNotes ? (
            <EuiOverlayMask>
              <EuiModal onClose={toggleShowNotes}>
                <Notes
                  associateNote={associateNote}
                  notes={notes}
                  getNewNoteId={getNewNoteId}
                  updateNote={updateNote}
                />
              </EuiModal>
            </EuiOverlayMask>
          ) : null}
        </>
      </EuiToolTip>
    </ButtonContainer>
  )
);

export const HistoryButton = pure<{ history: History[] }>(({ history }) => (
  <EuiToolTip data-test-subj="timeline-history-tool-tip" content={i18n.HISTORY_TOOL_TIP}>
    <EuiButton
      data-test-subj="timeline-history"
      iconType="arrowDown"
      iconSide="right"
      isDisabled={true}
      onClick={() => window.alert('Show history')}
    >
      <HistoryButtonLabel>
        <Facet>{history.length}</Facet>
        <LabelText>History</LabelText>
      </HistoryButtonLabel>
    </EuiButton>
  </EuiToolTip>
));

export const StreamLive = pure<{ isLive: boolean; timelineId: string; updateIsLive: UpdateIsLive }>(
  ({ isLive, timelineId, updateIsLive }) => (
    <EuiToolTip data-test-subj="timeline-stream-tool-tip" content={i18n.STREAM_LIVE_TOOL_TIP}>
      <ButtonContainer>
        <EuiButton
          data-test-subj="timeline-stream-live"
          color={isLive ? 'secondary' : 'primary'}
          fill={isLive ? true : false}
          iconType="play"
          iconSide="left"
          isDisabled={true}
          onClick={() => updateIsLive({ id: timelineId, isLive: !isLive })}
        >
          {i18n.STREAM_LIVE}
        </EuiButton>
      </ButtonContainer>
    </EuiToolTip>
  )
);

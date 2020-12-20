/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filter, pick, uniqBy } from 'lodash/fp';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../../common/types/timeline';
import { appSelectors } from '../../../../common/store/app';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { AddNote } from '../../notes/add_note';
import { CREATED_BY, NOTES } from '../../notes/translations';
import { PARTICIPANTS } from '../../../../cases/translations';
import { NotePreviews } from '../../open_timeline/note_previews';
import { TimelineResultNote } from '../../open_timeline/types';
import { EventDetails } from '../event_details';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
  margin: 0;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow-x: hidden;
  overflow-y: auto;
`;

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

const StyledPanel = styled(EuiPanel)`
  border: 0;
  box-shadow: none;
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex: 0;
`;

const Username = styled(EuiText)`
  font-weight: bold;
`;

interface UsernameWithAvatar {
  username: string;
}

const UsernameWithAvatarComponent: React.FC<UsernameWithAvatar> = ({ username }) => (
  <StyledEuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiAvatar data-test-subj="avatar" name={username} size="l" />
    </EuiFlexItem>
    <EuiFlexItem>
      <Username>{username}</Username>
    </EuiFlexItem>
  </StyledEuiFlexGroup>
);

const UsernameWithAvatar = React.memo(UsernameWithAvatarComponent);

interface ParticipantsProps {
  users: TimelineResultNote[];
}

const ParticipantsComponent: React.FC<ParticipantsProps> = ({ users }) => {
  const List = useMemo(
    () =>
      users.map((user) => (
        <Fragment key={user.updatedBy!}>
          <UsernameWithAvatar key={user.updatedBy!} username={user.updatedBy!} />
          <EuiSpacer size="s" />
        </Fragment>
      )),
    [users]
  );

  if (!users.length) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h4>{PARTICIPANTS}</h4>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      {List}
    </>
  );
};

ParticipantsComponent.displayName = 'ParticipantsComponent';

const Participants = React.memo(ParticipantsComponent);

interface NotesTabContentProps {
  timelineId: string;
}

const NotesTabContentComponent: React.FC<NotesTabContentProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    createdBy,
    expandedEvent,
    eventIdToNoteIds,
    status: timelineStatus,
  } = useDeepEqualSelector((state) =>
    pick(
      ['createdBy', 'expandedEvent', 'eventIdToNoteIds', 'status'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );

  const { browserFields, docValueFields } = useSourcererScope(SourcererScopeName.timeline);

  const getNotesAsCommentsList = useMemo(
    () => appSelectors.selectNotesAsCommentsListSelector(),
    []
  );
  const [newNote, setNewNote] = useState('');
  const isImmutable = timelineStatus === TimelineStatus.immutable;
  const notes: TimelineResultNote[] = useDeepEqualSelector(getNotesAsCommentsList);

  // filter for savedObjectId to make sure we don't display `elastic` user while saving the note
  const participants = useMemo(() => uniqBy('updatedBy', filter('savedObjectId', notes)), [notes]);

  const associateNote = useCallback(
    (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
    [dispatch, timelineId]
  );

  const handleOnEventClosed = useCallback(() => {
    dispatch(timelineActions.toggleExpandedEvent({ timelineId }));
  }, [dispatch, timelineId]);

  const EventDetailsContent = useMemo(
    () =>
      expandedEvent.eventId ? (
        <EventDetails
          browserFields={browserFields}
          docValueFields={docValueFields}
          handleOnEventClosed={handleOnEventClosed}
          timelineId={timelineId}
        />
      ) : null,
    [browserFields, docValueFields, expandedEvent.eventId, handleOnEventClosed, timelineId]
  );

  const SidebarContent = useMemo(
    () => (
      <>
        {createdBy && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h4>{CREATED_BY}</h4>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <UsernameWithAvatar username={createdBy} />
            <EuiSpacer size="xxl" />
          </>
        )}
        <Participants users={participants} />
      </>
    ),
    [createdBy, participants]
  );

  return (
    <FullWidthFlexGroup>
      <ScrollableFlexItem grow={2}>
        <StyledPanel paddingSize="s">
          <EuiTitle>
            <h3>{NOTES}</h3>
          </EuiTitle>
          <EuiSpacer />
          <NotePreviews eventIdToNoteIds={eventIdToNoteIds} notes={notes} timelineId={timelineId} />
          <EuiSpacer size="s" />
          {!isImmutable && (
            <AddNote associateNote={associateNote} newNote={newNote} updateNewNote={setNewNote} />
          )}
        </StyledPanel>
      </ScrollableFlexItem>
      <VerticalRule />
      <ScrollableFlexItem grow={1}>{EventDetailsContent ?? SidebarContent}</ScrollableFlexItem>
    </FullWidthFlexGroup>
  );
};

NotesTabContentComponent.displayName = 'NotesTabContentComponent';

const NotesTabContent = React.memo(NotesTabContentComponent);

// eslint-disable-next-line import/no-default-export
export { NotesTabContent as default };

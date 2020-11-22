/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiPanel } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../../common/types/timeline';
import { appSelectors } from '../../../../common/store/app';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { AddNote } from '../../notes/add_note';
import { InMemoryTable } from '../../notes';
import { columns } from '../../notes/columns';
import { search } from '../../notes/helpers';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
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

interface NotesTabContentProps {
  timelineId: string;
}

const NotesTabContentComponent: React.FC<NotesTabContentProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { status: timelineStatus, noteIds } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
  const [newNote, setNewNote] = useState('');
  const isImmutable = timelineStatus === TimelineStatus.immutable;
  const notesById = useDeepEqualSelector(getNotesByIds);

  const items = useMemo(() => appSelectors.getNotes(notesById, noteIds), [notesById, noteIds]);

  const associateNote = useCallback(
    (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
    [dispatch, timelineId]
  );

  return (
    <FullWidthFlexGroup>
      <ScrollableFlexItem grow={2}>
        <StyledPanel>
          <EuiTitle>
            <h3>{'Notes'}</h3>
          </EuiTitle>
          <EuiSpacer />
          <InMemoryTable
            data-test-subj="notes-table"
            items={items}
            columns={columns}
            search={search}
            sorting={true}
          />
          <EuiSpacer size="s" />
          {!isImmutable && (
            <AddNote associateNote={associateNote} newNote={newNote} updateNewNote={setNewNote} />
          )}
        </StyledPanel>
      </ScrollableFlexItem>
      <VerticalRule />
      <ScrollableFlexItem grow={1}>{/* SIDEBAR PLACEHOLDER */}</ScrollableFlexItem>
    </FullWidthFlexGroup>
  );
};

NotesTabContentComponent.displayName = 'NotesTabContentComponent';

export const NotesTabContent = React.memo(NotesTabContentComponent);

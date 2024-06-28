/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineType } from '../../../../common/api/timeline';
import { render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import React from 'react';
import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import { useUserPrivileges } from '../user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../user_privileges/endpoint/mocks';

import { AddEventNoteAction } from './add_note_icon_item';
import { TimelineId } from '@kbn/timelines-plugin/public/store/timeline';
import { NotesFlyout } from '../../../timelines/components/timeline/properties/notes_flyout';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { useDispatch } from 'react-redux';

jest.mock('../../experimental_features_service');

jest.mock('../user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

const useDispatchMock = useDispatch as jest.Mock;

jest.mock('../../../timelines/components/timeline/properties/notes_flyout', () => {
  return {
    NotesFlyout: jest.fn(),
  };
});

const NotesFlyoutMock = NotesFlyout as unknown as jest.Mock;

jest.mock('../../../timelines/components/timeline/properties/helpers', () => {
  return {
    NotesButton: jest.fn(),
  };
});

const NotesButtonMock = NotesButton as unknown as jest.Mock;

const mockEventIdToNoteIds = {
  'event-1': ['note-1', 'note-3'],
  'event-2': ['note-2'],
};

const note1 = {
  created: new Date('2024-06-25T13:34:35.669Z'),
  id: 'note-1',
  lastEdit: new Date('2024-06-25T13:34:35.669Z'),
  note: 'First Comment',
  user: 'elastic',
  saveObjectId: '7402b6fc-34a8-42bd-b590-389df3011c6b',
  version: 'WzU0OTcsMV0=',
  eventId: 'event-1',
  timelineId: '35937e12-b600-4bdd-a79e-5431aa39ab4b',
};

const note2 = {
  created: new Date('2024-06-25T11:57:22.031Z'),
  id: 'note-2',
  lastEdit: new Date('2024-06-25T11:57:22.031Z'),
  note: 'Some Note',
  user: 'elastic',
  saveObjectId: 'fafdfe3e-82b6-4c09-b116-fcba4a5390de',
  version: 'WzU0OTUsMV0=',
  eventId: 'event-2',
  timelineId: '35937e12-b600-4bdd-a79e-5431aa39ab4b',
};

const note3 = {
  ...note1,
  id: 'note-3',
  eventId: 'event-1',
  note: 'Third Comment',
  saveObjectId: 'note-3',
};

const mockState = structuredClone(mockGlobalState);

const mockLocalState = {
  ...mockState,
  timeline: {
    ...mockState.timeline,
    timelineById: {
      [TimelineId.test]: {
        ...mockState.timeline.timelineById[TimelineId.test],
        eventIdToNoteIds: {
          ...mockEventIdToNoteIds,
        },
      },
    },
  },
  app: {
    ...mockState.app,
    notesById: {
      'note-1': note1,
      'note-2': note2,
      'note-3': note3,
    },
  },
};

const refetchMock = jest.fn();

const TestWrapper = (props: ComponentProps<typeof TestProviders>) => {
  const localState = structuredClone(mockLocalState);

  const { store = createMockStore(localState), children, ...rest } = props;

  return (
    <TestProviders store={store} {...rest}>
      {children}
    </TestProviders>
  );
};

const renderTestComponent = (
  props: Partial<ComponentProps<typeof AddEventNoteAction>> = {},
  store?: ReturnType<typeof createMockStore>
) => {
  const localProps: ComponentProps<typeof AddEventNoteAction> = {
    timelineId: TimelineId.test,
    eventId: 'event-1',
    refetch: refetchMock,
    ariaLabel: 'Add Note',
    ...props,
  };

  return render(
    <TestWrapper store={store}>
      <AddEventNoteAction {...localProps} />
    </TestWrapper>
  );
};

const dispatchMock = jest.fn();

describe('AddEventNoteAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });

    NotesFlyoutMock.mockImplementation(() => <div data-test-subj="timeline-notes-flyout" />);

    NotesButtonMock.mockImplementation(({ isDisabled }: { isDisabled: boolean }) => (
      <button
        type="button"
        disabled={isDisabled}
        data-test-subj="timeline-notes-button-small-mock"
      />
    ));
    useDispatchMock.mockReturnValue(dispatchMock);
  });

  describe('display notes and flyout', () => {
    test('should display correct notes to the flyout', async () => {
      renderTestComponent({ eventId: 'event-1' });

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
      });

      expect(NotesFlyoutMock).toHaveBeenCalled();
      expect(NotesFlyoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-1',
          timelineId: TimelineId.test,
          associateNote: expect.any(Function),
          onClose: expect.any(Function),
          show: false,
          notes: [note1, note3].map((note) => ({
            savedObjectId: note.saveObjectId,
            note: note.note,
            noteId: note.id,
            updated: (note.lastEdit ?? note.created).getTime(),
            updatedBy: note.user,
          })),
          toggleShowAddNote: expect.any(Function),
        }),
        expect.anything()
      );
    });

    test('should render button correctly when multiple notes exist', async () => {
      renderTestComponent({ eventId: 'event-1' });

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
      });

      expect(NotesButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ariaLabel: 'Add Note',
          'data-test-subj': 'add-note',
          isDisabled: false,
          timelineType: TimelineType.default,
          toggleShowNotes: expect.any(Function),
          toolTip: '2 Notes available. Click to add more.',
          eventId: 'event-1',
          notesCount: 2,
        }),
        expect.anything()
      );
    });

    test('should render button correctly when single note exists', async () => {
      renderTestComponent({ eventId: 'event-2' });

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
      });

      expect(NotesButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ariaLabel: 'Add Note',
          'data-test-subj': 'add-note',
          isDisabled: false,
          timelineType: TimelineType.default,
          toggleShowNotes: expect.any(Function),
          toolTip: '1 Note available. Click to add more.',
          eventId: 'event-2',
          notesCount: 1,
        }),
        expect.anything()
      );
    });

    test('should render button correctly when no note exist', async () => {
      renderTestComponent({ eventId: 'event-3' });

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
      });

      expect(NotesButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ariaLabel: 'Add Note',
          'data-test-subj': 'add-note',
          isDisabled: false,
          timelineType: TimelineType.default,
          toggleShowNotes: expect.any(Function),
          toolTip: 'Add Note',
          eventId: 'event-3',
          notesCount: 0,
        }),
        expect.anything()
      );
    });

    test('should associate note correctly', async () => {
      renderTestComponent({ eventId: 'event-1' });

      const { associateNote } = NotesFlyoutMock.mock.calls[0][0];

      associateNote();
      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(refetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('button state', () => {
    test('should disable the add note button when the user does NOT have crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      renderTestComponent();

      expect(screen.getByTestId('timeline-notes-button-small-mock')).toHaveProperty(
        'disabled',
        true
      );
    });

    test('should enable the add note button when the user has crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      renderTestComponent();

      expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
    });
  });
});

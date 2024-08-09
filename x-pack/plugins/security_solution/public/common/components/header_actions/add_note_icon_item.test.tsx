/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import React from 'react';
import { TestProviders } from '../../mock';
import { getEndpointPrivilegesInitialStateMock } from '../user_privileges/endpoint/mocks';

import { AddEventNoteAction } from './add_note_icon_item';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { useUserPrivileges } from '../user_privileges';

jest.mock('../../../timelines/components/timeline/properties/helpers', () => {
  return {
    NotesButton: jest.fn(),
  };
});

jest.mock('../user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const NotesButtonMock = NotesButton as unknown as jest.Mock;

const TestWrapper = (props: ComponentProps<typeof TestProviders>) => {
  return <TestProviders {...props} />;
};

const toggleShowNotesMock = jest.fn();

const renderTestComponent = (props: Partial<ComponentProps<typeof AddEventNoteAction>> = {}) => {
  const localProps: ComponentProps<typeof AddEventNoteAction> = {
    timelineType: TimelineTypeEnum.default,
    eventId: 'event-1',
    ariaLabel: 'Add Note',
    toggleShowNotes: toggleShowNotesMock,
    notesCount: 2,
    ...props,
  };

  return render(<AddEventNoteAction {...localProps} />, {
    wrapper: TestWrapper,
  });
};

describe('AddEventNoteAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });

    NotesButtonMock.mockImplementation(({ isDisabled }: { isDisabled: boolean }) => (
      <button
        type="button"
        disabled={isDisabled}
        data-test-subj="timeline-notes-button-small-mock"
      />
    ));
  });

  describe('display notes button', () => {
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
          timelineType: TimelineTypeEnum.default,
          toggleShowNotes: expect.any(Function),
          toolTip: '2 Notes available. Click to view them & add more.',
          eventId: 'event-1',
          notesCount: 2,
        }),
        expect.anything()
      );
    });

    test('should render button correctly when single note exists', async () => {
      renderTestComponent({ eventId: 'event-2', notesCount: 1 });

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
      });

      expect(NotesButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ariaLabel: 'Add Note',
          'data-test-subj': 'add-note',
          isDisabled: false,
          timelineType: TimelineTypeEnum.default,
          toggleShowNotes: expect.any(Function),
          toolTip: '1 Note available. Click to view it & add more.',
          eventId: 'event-2',
          notesCount: 1,
        }),
        expect.anything()
      );
    });

    test('should render button correctly when no note exist', async () => {
      renderTestComponent({ eventId: 'event-3', notesCount: 0 });

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small-mock')).not.toBeDisabled();
      });

      expect(NotesButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ariaLabel: 'Add Note',
          'data-test-subj': 'add-note',
          isDisabled: false,
          timelineType: TimelineTypeEnum.default,
          toggleShowNotes: expect.any(Function),
          toolTip: 'Add Note',
          eventId: 'event-3',
          notesCount: 0,
        }),
        expect.anything()
      );
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

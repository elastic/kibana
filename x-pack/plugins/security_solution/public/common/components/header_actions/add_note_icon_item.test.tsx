/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineType } from '../../../../common/api/timeline';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../mock';
import { useUserPrivileges } from '../user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../user_privileges/endpoint/mocks';

import { AddEventNoteAction } from './add_note_icon_item';

jest.mock('../user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('AddEventNoteAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('timeline is saved', () => {
    it('should disable the add note button when the user does NOT have crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <AddEventNoteAction
            showNotes={false}
            timelineType={TimelineType.default}
            toggleShowNotes={jest.fn}
            isTimelineSaved={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).toBeDisabled();
    });

    it('should enable the add note button when the user has crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <AddEventNoteAction
            showNotes={false}
            timelineType={TimelineType.default}
            toggleShowNotes={jest.fn}
            isTimelineSaved={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
    });
  });

  describe('timeline is not saved', () => {
    it('should disable the add note button when the user does NOT have crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <AddEventNoteAction
            showNotes={false}
            timelineType={TimelineType.default}
            toggleShowNotes={jest.fn}
            isTimelineSaved={false}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).toBeDisabled();
    });

    it('should disable the add note button when the user has crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <AddEventNoteAction
            showNotes={false}
            timelineType={TimelineType.default}
            toggleShowNotes={jest.fn}
            isTimelineSaved={false}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).toBeDisabled();
    });
  });

  describe('it is a timeline template', () => {
    it('should disable the add note button when the user does have crud privileges and the timeline is saved', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <AddEventNoteAction
            showNotes={false}
            timelineType={TimelineType.template}
            toggleShowNotes={jest.fn}
            isTimelineSaved={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).toBeDisabled();
    });
  });
});

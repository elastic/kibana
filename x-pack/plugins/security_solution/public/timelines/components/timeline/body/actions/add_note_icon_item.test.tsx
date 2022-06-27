/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AddEventNoteAction } from './add_note_icon_item';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import { TestProviders } from '../../../../../common/mock';
import { TimelineType } from '../../../../../../common/types';

jest.mock('../../../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('AddEventNoteAction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isDisabled', () => {
    test('it disables the add note button when the user does NOT have crud privileges', () => {
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
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).toHaveClass(
        'euiButtonIcon-isDisabled'
      );
    });

    test('it enables the add note button when the user has crud privileges', () => {
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
          />
        </TestProviders>
      );

      expect(screen.getByTestId('timeline-notes-button-small')).not.toHaveClass(
        'euiButtonIcon-isDisabled'
      );
    });
  });
});

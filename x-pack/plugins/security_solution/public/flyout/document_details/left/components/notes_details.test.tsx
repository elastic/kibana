/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { NotesDetails } from './notes_details';
import { ADD_NOTE_BUTTON_TEST_ID } from './test_ids';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

jest.mock('../../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const panelContextValue = {
  eventId: 'event id',
} as unknown as DocumentDetailsContext;

const renderNotesDetails = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <NotesDetails />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('NotesDetails', () => {
  beforeEach(() => {
    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
    });
  });

  it('should fetch notes for the document id', () => {
    renderNotesDetails();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should render an add note button', () => {
    const { getByTestId } = renderNotesDetails();
    expect(getByTestId(ADD_NOTE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render an add note button for users without crud privileges', () => {
    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false, read: true },
    });
    const { queryByTestId } = renderNotesDetails();
    expect(queryByTestId(ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});

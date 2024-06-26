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
  it('should fetch notes for the document id', () => {
    renderNotesDetails();
    expect(mockDispatch).toHaveBeenCalled();
  });
});

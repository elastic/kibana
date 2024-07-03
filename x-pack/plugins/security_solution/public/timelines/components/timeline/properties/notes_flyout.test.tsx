/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineId } from '../../../../../common/types';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { NoteCards } from '../../notes/note_cards';
import type { TimelineResultNote } from '../../open_timeline/types';
import { NotesFlyout } from './notes_flyout';

const onClose = jest.fn();
const toggleShowAddNote = jest.fn();
const associateNote = jest.fn();
const eventId = 'sample_event_id';
const notes = [] as TimelineResultNote[];

jest.mock('../../notes/note_cards', () => ({
  NoteCards: jest.fn(),
}));

const renderTestComponent = (props?: Partial<ComponentProps<typeof NotesFlyout>>) => {
  return render(
    <NotesFlyout
      show={true}
      eventId={eventId}
      onClose={onClose}
      toggleShowAddNote={toggleShowAddNote}
      associateNote={associateNote}
      notes={notes}
      timelineId={TimelineId.test}
      {...props}
    />,
    {
      wrapper: ({ children }) => (
        <ThemeProvider
          theme={{
            eui: {
              euiZFlyout: 1000,
            },
          }}
        >
          {children}
        </ThemeProvider>
      ),
    }
  );
};

describe('Notes Flyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (NoteCards as unknown as jest.Mock).mockImplementation(
      jest.fn().mockReturnValue(<div>{`NoteCards`}</div>)
    );
  });

  it('should respond to visibility prop correctly', () => {
    renderTestComponent({
      show: false,
    });

    expect(screen.queryByTestId('timeline-notes-flyout')).not.toBeInTheDocument();
  });

  it('should display notes correctly', () => {
    renderTestComponent({
      show: true,
    });

    expect(screen.getByText('NoteCards')).toBeVisible();
  });

  it('should trigger onClose correctly', () => {
    renderTestComponent({
      show: true,
    });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});

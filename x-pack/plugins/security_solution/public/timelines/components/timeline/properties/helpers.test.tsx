/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { NotesButton } from './helpers';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { ThemeProvider } from 'styled-components';

const toggleShowNotesMock = jest.fn();

const defaultProps: ComponentProps<typeof NotesButton> = {
  ariaLabel: 'Sample Notes',
  isDisabled: false,
  toggleShowNotes: toggleShowNotesMock,
  eventId: 'event-id',
  notesCount: 1,
  timelineType: TimelineTypeEnum.default,
  toolTip: 'Sample Tooltip',
};

const TestWrapper: React.FC = ({ children }) => {
  return <ThemeProvider theme={{ eui: { euiColorDanger: 'red' } }}>{children}</ThemeProvider>;
};

const renderTestComponent = (props?: Partial<ComponentProps<typeof NotesButton>>) => {
  const localProps = {
    ...defaultProps,
    ...props,
  };

  render(<NotesButton {...localProps} />, { wrapper: TestWrapper });
};

describe('helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('should show the notes button correctly', () => {
    renderTestComponent();

    expect(screen.getByTestId('timeline-notes-button-small')).toBeVisible();
  });

  test('should show the notification dot correctly when notes are available', () => {
    renderTestComponent();

    expect(screen.getByTestId('timeline-notes-button-small')).toBeVisible();
    expect(screen.getByTestId('timeline-notes-notification-dot')).toBeVisible();
  });

  test('should not show the notification dot where there are no notes available', () => {
    renderTestComponent({
      notesCount: 0,
    });

    expect(screen.getByTestId('timeline-notes-button-small')).toBeVisible();
    expect(screen.queryByTestId('timeline-notes-notification-dot')).not.toBeInTheDocument();
  });

  test('should call the toggleShowNotes function when the button is clicked', () => {
    renderTestComponent();

    const button = screen.getByTestId('timeline-notes-button-small');

    fireEvent.click(button);

    expect(toggleShowNotesMock).toHaveBeenCalledTimes(1);
    expect(toggleShowNotesMock).toHaveBeenCalledWith('event-id');
  });

  test('should call the toggleShowNotes correctly when the button is clicked and eventId is not available', () => {
    renderTestComponent({
      eventId: undefined,
    });

    const button = screen.getByTestId('timeline-notes-button-small');

    fireEvent.click(button);

    expect(toggleShowNotesMock).toHaveBeenCalledTimes(1);
    expect(toggleShowNotesMock).toHaveBeenCalledWith();
  });
});

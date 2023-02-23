/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../../common/mock/react_beautiful_dnd';

import { TestProviders } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import * as timelineActions from '../../store/timeline/actions';

import { Flyout } from '.';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../timeline', () => ({
  StatefulTimeline: () => <div />,
}));

jest.mock('../../../common/hooks/timeline/use_timeline_save_prompt');

describe('Flyout', () => {
  const props = {
    onAppLeave: jest.fn(),
    timelineId: TimelineId.test,
  };

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  describe('rendering', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>
          <Flyout {...props} />
        </TestProviders>
      );
      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders the default flyout state as a bottom bar', () => {
      render(
        <TestProviders>
          <Flyout {...props} />
        </TestProviders>
      );

      expect(screen.getByText('Untitled timeline')).toBeInTheDocument();
    });

    test('should call the onOpen when the mouse is clicked for rendering', () => {
      render(
        <TestProviders>
          <Flyout {...props} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('flyoutOverlay'));

      expect(mockDispatch).toBeCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: true })
      );
    });
  });
});

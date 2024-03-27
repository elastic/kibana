/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { Video } from './video';
import { OverviewSteps, QuickStartSectionCardsId, SectionId } from '../../types';
import type { EuiFlexGroupProps } from '@elastic/eui';
import { useStepContext } from '../../context/step_context';
import { WATCH_VIDEO_BUTTON_TITLE } from '../../translations';
import { defaultExpandedCards } from '../../storage';

jest.mock('../../context/step_context');
jest.mock('./content_wrapper');

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiFlexGroup: ({ children, onClick }: EuiFlexGroupProps) => {
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div data-test-subj="watch-video-overlay" onClick={onClick}>
        {children}
      </div>
    );
  },
  EuiFlexItem: ({ children }: { children: React.ReactElement }) => <div>{children}</div>,
  EuiIcon: () => <span data-test-subj="mock-play-icon" />,
  useEuiTheme: () => ({ euiTheme: { colors: { fullShade: '#000', emptyShade: '#fff' } } }),
  EuiCodeBlock: () => <span data-test-subj="mock-code-block" />,
}));

describe('Video Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders overlay if step is not completed', () => {
    const { getByTestId } = render(<Video />);
    const overlay = getByTestId('watch-video-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('renders video after clicking the overlay', () => {
    const { toggleTaskCompleteStatus } = useStepContext();
    const { getByTestId, queryByTestId } = render(<Video />);
    const overlay = getByTestId('watch-video-overlay');
    fireEvent.click(overlay);
    expect(toggleTaskCompleteStatus).toHaveBeenCalledWith({
      stepId: OverviewSteps.getToKnowElasticSecurity,
      cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
      sectionId: SectionId.quickStart,
      undo: false,
    });

    const iframe = screen.getByTitle(WATCH_VIDEO_BUTTON_TITLE);
    expect(iframe).toBeInTheDocument();

    const overlayAfterClick = queryByTestId('watch-video-overlay');
    expect(overlayAfterClick).not.toBeInTheDocument();
  });

  it('renders video if step is completed', () => {
    (useStepContext as jest.Mock).mockReturnValue({
      expandedCardSteps: defaultExpandedCards,
      finishedSteps: {
        [QuickStartSectionCardsId.watchTheOverviewVideo]: new Set([
          OverviewSteps.getToKnowElasticSecurity,
        ]),
      },
      onStepClicked: jest.fn(),
      toggleTaskCompleteStatus: jest.fn(),
    });
    const { getByTitle, queryByTestId } = render(<Video />);
    const iframe = getByTitle(WATCH_VIDEO_BUTTON_TITLE);
    expect(iframe).toBeInTheDocument();

    const overlay = queryByTestId('watch-video-overlay');
    expect(overlay).not.toBeInTheDocument();
  });
});

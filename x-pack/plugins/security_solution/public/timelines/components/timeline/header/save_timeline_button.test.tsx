/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import type { SaveTimelineComponentProps } from './save_timeline_button';
import { SaveTimelineButton } from './save_timeline_button';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

const TEST_ID = {
  SAVE_TIMELINE_MODAL: 'save-timeline-modal',
  SAVE_TIMELINE_BTN: 'save-timeline-button-icon',
  SAVE_TIMELINE_TOOLTIP: 'save-timeline-tooltip',
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/components/user_privileges');

const props = {
  initialFocus: 'title' as const,
  timelineId: 'timeline-1',
  toolTip: 'tooltip message',
};

const TestSaveTimelineButton = (_props: SaveTimelineComponentProps) => (
  <TestProviders>
    <SaveTimelineButton {..._props} />
  </TestProviders>
);

jest.mock('raf', () => {
  return jest.fn().mockImplementation((cb) => cb());
});

describe('SaveTimelineButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // skipping this test because popover is not getting visible by RTL gestures.
  //
  // Raised a bug with eui team: https://github.com/elastic/eui/issues/6065
  xit('Show tooltip', async () => {
    render(<TestSaveTimelineButton {...props} />);
    const saveTimelineIcon = screen.queryAllByTestId(TEST_ID.SAVE_TIMELINE_BTN)[0];

    fireEvent.mouseOver(saveTimelineIcon);

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeVisible();
    });
  });

  it('should show a button with pencil icon', () => {
    render(<TestSaveTimelineButton {...props} />);

    expect(screen.getByTestId(TEST_ID.SAVE_TIMELINE_BTN).firstChild).toHaveAttribute(
      'data-euiicon-type',
      'pencil'
    );
  });

  it('should have edit timeline btn disabled with tooltip if user does not have write access', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });
    render(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(screen.getByTestId(TEST_ID.SAVE_TIMELINE_BTN)).toBeDisabled();
  });

  it('should not show modal if user does not have write access', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });
    render(<TestSaveTimelineButton {...props} />);

    expect(screen.queryByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).not.toBeInTheDocument();

    const saveTimelineIcon = screen.getByTestId(TEST_ID.SAVE_TIMELINE_BTN);

    fireEvent.click(saveTimelineIcon);

    await waitFor(() => {
      expect(screen.queryAllByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toHaveLength(0);
    });
  });

  it('should show a modal when user has crud privileges', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    render(<TestSaveTimelineButton {...props} />);
    expect(screen.queryByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).not.toBeInTheDocument();

    const saveTimelineIcon = screen.queryAllByTestId(TEST_ID.SAVE_TIMELINE_BTN)[0];

    fireEvent.click(saveTimelineIcon);

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_ID.SAVE_TIMELINE_TOOLTIP)).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(TEST_ID.SAVE_TIMELINE_MODAL)[0]).toBeVisible();
    });
  });
});

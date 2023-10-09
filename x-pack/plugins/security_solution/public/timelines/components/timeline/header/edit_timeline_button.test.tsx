/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import type { EditTimelineComponentProps } from './edit_timeline_button';
import { EditTimelineButton } from './edit_timeline_button';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

const TEST_ID = {
  EDIT_TIMELINE_MODAL: 'edit-timeline-modal',
  EDIT_TIMELINE_BTN: 'edit-timeline-button-icon',
  EDIT_TIMELINE_TOOLTIP: 'edit-timeline-tooltip',
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

const TestEditTimelineButton = (_props: EditTimelineComponentProps) => (
  <TestProviders>
    <EditTimelineButton {..._props} />
  </TestProviders>
);

jest.mock('raf', () => {
  return jest.fn().mockImplementation((cb) => cb());
});

describe('EditTimelineButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Show tooltip', async () => {
    render(<TestEditTimelineButton {...props} />);
    const editTimelineIcon = screen.queryAllByTestId(TEST_ID.EDIT_TIMELINE_BTN)[0];

    fireEvent.mouseOver(editTimelineIcon);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeVisible();
    });
  });

  it('should show a button with pencil icon', () => {
    render(<TestEditTimelineButton {...props} />);

    expect(screen.getByTestId(TEST_ID.EDIT_TIMELINE_BTN).firstChild).toHaveAttribute(
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
        <EditTimelineButton {...props} />
      </TestProviders>
    );
    expect(screen.getByTestId(TEST_ID.EDIT_TIMELINE_BTN)).toBeDisabled();
  });

  it('should not show modal if user does not have write access', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });
    render(<TestEditTimelineButton {...props} />);

    expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).not.toBeInTheDocument();

    const editTimelineIcon = screen.getByTestId(TEST_ID.EDIT_TIMELINE_BTN);

    fireEvent.click(editTimelineIcon);

    await waitFor(() => {
      expect(screen.queryAllByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).toHaveLength(0);
    });
  });

  it('should show a modal when user has crud privileges', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    render(<TestEditTimelineButton {...props} />);
    expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).not.toBeInTheDocument();

    const editTimelineIcon = screen.queryAllByTestId(TEST_ID.EDIT_TIMELINE_BTN)[0];

    fireEvent.click(editTimelineIcon);

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_TOOLTIP)).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(TEST_ID.EDIT_TIMELINE_MODAL)[0]).toBeVisible();
    });
  });
});

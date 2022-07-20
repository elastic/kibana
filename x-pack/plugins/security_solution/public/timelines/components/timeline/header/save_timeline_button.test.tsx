/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import type { OwnProps as SaveTimelineComponentProps } from './save_timeline_button';
import { SaveTimelineButton } from './save_timeline_button';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../../common/mock';
import { createStore } from '../../../../common/store';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/components/user_privileges');

const props: SaveTimelineComponentProps = {
  initialFocus: 'title' as const,
  timelineId: 'timeline-1',
  toolTip: 'tooltip message',
};

const getStore = (state = mockGlobalState) =>
  createStore(
    state,
    SUB_PLUGINS_REDUCER,
    kibanaObservable,
    createSecuritySolutionStorageMock().storage
  );

const defaultStore = getStore();

const storeWithReadOnlyTimeLineAccess = getStore({
  ...mockGlobalState,
  timeline: { ...mockGlobalState.timeline, showCallOutUnauthorizedMsg: true },
});

const TestSaveTimelineButton: React.FC<SaveTimelineComponentProps> = (_props) => (
  <TestProviders store={defaultStore}>
    <SaveTimelineButton {..._props} />
  </TestProviders>
);

describe('SaveTimelineButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // skipping this test because popover is not getting visible by RTL gestures.
  //
  // Raised a bug with eui team: https://github.com/elastic/eui/issues/6065
  xit('Show tooltip', async () => {
    const { container } = render(<TestSaveTimelineButton {...props} />);
    const saveTimelineIcon = container.querySelectorAll(
      '[data-test-subj="save-timeline-button-icon"]'
    )[0];

    const mouseenter = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: false,
    });

    fireEvent.mouseOver(saveTimelineIcon, mouseenter);
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeVisible();
    });
  });

  it('Hide tooltip', async () => {
    const { container } = render(<TestSaveTimelineButton {...props} />);

    const saveTimelineIcon = container.querySelectorAll(
      '[data-test-subj="save-timeline-button-icon"]'
    )[0];

    fireEvent.click(saveTimelineIcon);

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-subj="save-timeline-btn-tooltip"]')
      ).not.toBeInTheDocument();
    });
  });

  it('should show a button with pencil icon', () => {
    const { container } = render(<TestSaveTimelineButton {...props} />);
    expect(
      container.querySelectorAll('[data-test-subj="save-timeline-button-icon"]')[0].firstChild
    ).toHaveAttribute('data-euiicon-type', 'pencil');
  });

  it('should have edit timeline btn disabled with tooltip if user does not have write access', () => {
    const { container } = render(
      <TestProviders store={storeWithReadOnlyTimeLineAccess}>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(
      container.querySelectorAll('[data-test-subj="save-timeline-button-icon"]')[0]
    ).toBeDisabled();
  });

  it('should show a modal when showOverlay equals true', async () => {
    const { container, baseElement } = render(<TestSaveTimelineButton {...props} />);
    expect(
      container.querySelector('[data-test-subj="save-timeline-modal-comp"]')
    ).not.toBeInTheDocument();

    const saveTimelineIcon = container.querySelectorAll(
      '[data-test-subj="save-timeline-button-icon"]'
    )[0];

    fireEvent.click(saveTimelineIcon);

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-subj="save-timeline-btn-tooltip"]')
      ).not.toBeInTheDocument();
      expect(
        baseElement.querySelectorAll('[data-test-subj="save-timeline-modal"]')[0]
      ).toBeVisible();
    });
  });
});

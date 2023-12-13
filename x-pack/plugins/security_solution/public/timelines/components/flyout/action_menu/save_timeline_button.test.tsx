/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import type { SaveTimelineButtonProps } from './save_timeline_button';
import { SaveTimelineButton } from './save_timeline_button';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getTimelineStatusByIdSelector } from '../header/selectors';
import { TimelineStatus } from '../../../../../common/api/timeline';

const TEST_ID = {
  SAVE_TIMELINE_MODAL: 'save-timeline-modal',
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn().mockImplementation(() => () => {}),
  };
});

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../header/selectors', () => {
  return {
    getTimelineStatusByIdSelector: jest.fn().mockReturnValue(() => ({
      status: 'draft',
      isSaving: false,
    })),
  };
});

const props: SaveTimelineButtonProps = {
  timelineId: 'timeline-1',
};

const TestSaveTimelineButton = (_props: SaveTimelineButtonProps) => (
  <TestProviders>
    <SaveTimelineButton {..._props} />
  </TestProviders>
);

jest.mock('raf', () => {
  return jest.fn().mockImplementation((cb) => cb());
});

describe('SaveTimelineButton', () => {
  it('should disable the save timeline button when the user does not have write acceess', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });
    render(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should disable the save timeline button when the timeline is immutable', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    (getTimelineStatusByIdSelector as jest.Mock).mockReturnValue(() => ({
      status: TimelineStatus.immutable,
    }));
    render(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  describe('with draft timeline', () => {
    beforeAll(() => {
      (getTimelineStatusByIdSelector as jest.Mock).mockReturnValue(() => ({
        status: TimelineStatus.draft,
      }));
    });

    it('should not show the save modal if user does not have write access', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false },
      });
      render(<TestSaveTimelineButton {...props} />);

      expect(screen.queryByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).not.toBeInTheDocument();

      const saveTimelineBtn = screen.getByRole('button');

      fireEvent.click(saveTimelineBtn);

      await waitFor(() => {
        expect(screen.queryAllByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toHaveLength(0);
      });
    });

    it('should show the save modal when user has crud privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true },
      });
      render(<TestSaveTimelineButton {...props} />);
      expect(screen.queryByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).not.toBeInTheDocument();

      const saveTimelineBtn = screen.getByRole('button');

      fireEvent.click(saveTimelineBtn);

      await waitFor(() => {
        expect(screen.getByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toBeVisible();
      });
    });
  });

  describe('with active timeline', () => {
    beforeAll(() => {
      (getTimelineStatusByIdSelector as jest.Mock).mockReturnValue(() => ({
        status: TimelineStatus.active,
        isSaving: false,
      }));
    });

    it('should open the timeline save modal', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true },
      });
      render(<TestSaveTimelineButton {...props} />);

      const saveTimelineBtn = screen.getByRole('button');

      fireEvent.click(saveTimelineBtn);

      await waitFor(() => {
        expect(screen.getByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toBeInTheDocument();
      });
    });
  });
});

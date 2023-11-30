/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { SaveTimelineButtonProps } from './save_timeline_button';
import { SaveTimelineButton } from './save_timeline_button';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

const TEST_ID = {
  SAVE_TIMELINE_MODAL: 'save-timeline-modal',
};

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(),
  useShallowEqualSelector: jest.fn(),
}));

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
  it('should disable the save timeline button when the user does not have write access', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });
    (useDeepEqualSelector as jest.Mock).mockReturnValue({});

    const { getByRole } = render(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );

    expect(getByRole('button')).toBeDisabled();
  });

  it('should disable the save timeline button when the timeline is immutable', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      status: TimelineStatus.immutable,
    });

    const { getByRole } = render(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );

    expect(getByRole('button')).toBeDisabled();
  });

  describe('with draft timeline', () => {
    beforeAll(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        status: TimelineStatus.draft,
      });
    });

    it('should not show the save modal if user does not have write access', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false },
      });

      const { getByRole, queryByTestId, queryAllByTestId } = render(
        <TestSaveTimelineButton {...props} />
      );

      expect(queryByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).not.toBeInTheDocument();

      fireEvent.click(getByRole('button'));

      await waitFor(() => {
        expect(queryAllByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toHaveLength(0);
      });
    });

    it('should show the save modal when user has crud privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true },
      });

      const { getByTestId, getByRole, queryByTestId } = render(
        <TestSaveTimelineButton {...props} />
      );

      expect(queryByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).not.toBeInTheDocument();

      fireEvent.click(getByRole('button'));

      await waitFor(() => {
        expect(getByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toBeVisible();
      });
    });
  });

  describe('with active timeline', () => {
    beforeAll(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        status: TimelineStatus.active,
        isSaving: false,
      });
    });

    it('should open the timeline save modal', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true },
      });

      const { getByTestId, getByRole } = render(<TestSaveTimelineButton {...props} />);

      fireEvent.click(getByRole('button'));

      await waitFor(() => {
        expect(getByTestId(TEST_ID.SAVE_TIMELINE_MODAL)).toBeInTheDocument();
      });
    });
  });
});

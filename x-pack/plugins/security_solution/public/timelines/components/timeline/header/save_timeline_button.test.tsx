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
import { timelineActions } from '../../../store/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getTimelineStatusByIdSelector } from '../../flyout/header/selectors';
import { TimelineStatus } from '../../../../../common/api/timeline';
import * as timelineTranslations from './translations';

const TEST_ID = {
  EDIT_TIMELINE_MODAL: 'edit-timeline-modal',
  EDIT_TIMELINE_TOOLTIP: 'save-timeline-btn-tooltip',
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
jest.mock('../../flyout/header/selectors', () => {
  return {
    getTimelineStatusByIdSelector: jest.fn().mockReturnValue(() => ({
      status: 'draft',
      isSaving: false,
    })),
  };
});

jest.mock('../../../store/timeline', () => {
  const actual = jest.requireActual('../../../store/timeline');
  return {
    ...actual,
    timelineActions: {
      ...actual.timelineAction,
      saveTimeline: jest.fn(),
    },
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
  it('should have the correct aria label', () => {
    render(<TestSaveTimelineButton {...props} />);

    expect(screen.getByLabelText(timelineTranslations.SAVE_TIMELINE));
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
    expect(screen.getByLabelText(timelineTranslations.SAVE_TIMELINE)).toBeDisabled();
  });

  describe('with draft timeline', () => {
    it('should not show the edit modal if user does not have write access', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false },
      });
      render(<TestSaveTimelineButton {...props} />);

      expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).not.toBeInTheDocument();

      const saveTimelineIcon = screen.getByLabelText(timelineTranslations.SAVE_TIMELINE);

      fireEvent.click(saveTimelineIcon);

      await waitFor(() => {
        expect(screen.queryAllByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).toHaveLength(0);
      });
    });

    it('should show the edit when user has crud privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true },
      });
      render(<TestSaveTimelineButton {...props} />);
      expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).not.toBeInTheDocument();

      const saveTimelineIcon = screen.getByLabelText(timelineTranslations.SAVE_TIMELINE);

      fireEvent.click(saveTimelineIcon);

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_TOOLTIP)).not.toBeInTheDocument();
        expect(screen.getByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).toBeVisible();
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

    it('should save the timeline', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true },
      });
      render(<TestSaveTimelineButton {...props} />);

      const saveTimelineIcon = screen.getByLabelText(timelineTranslations.SAVE_TIMELINE);

      fireEvent.click(saveTimelineIcon);

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_ID.EDIT_TIMELINE_MODAL)).not.toBeInTheDocument();
        expect(timelineActions.saveTimeline as unknown as jest.Mock).toHaveBeenCalled();
      });
    });
  });
});

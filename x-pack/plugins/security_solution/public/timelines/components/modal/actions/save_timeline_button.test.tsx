/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SaveTimelineButton } from './save_timeline_button';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { TimelineStatusEnum } from '../../../../../common/api/timeline';
import { useCreateTimeline } from '../../../hooks/use_create_timeline';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../hooks/use_create_timeline');

const mockGetState = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSelector: (selector: any) =>
      selector({
        timeline: {
          timelineById: {
            'timeline-1': {
              ...mockGetState(),
            },
          },
        },
      }),
  };
});

const renderSaveTimelineButton = () =>
  render(
    <TestProviders>
      <SaveTimelineButton timelineId="timeline-1" />
    </TestProviders>
  );

describe('SaveTimelineButton', () => {
  it('should render components', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      status: TimelineStatusEnum.active,
      isSaving: false,
    });
    (useCreateTimeline as jest.Mock).mockReturnValue({});

    const { getByTestId, getByText, queryByTestId } = renderSaveTimelineButton();

    expect(getByTestId('timeline-modal-save-timeline')).toBeInTheDocument();
    expect(getByText('Save')).toBeInTheDocument();

    expect(queryByTestId('save-timeline-modal')).not.toBeInTheDocument();
  });

  it('should open the timeline save modal', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      status: TimelineStatusEnum.active,
      isSaving: false,
    });
    (useCreateTimeline as jest.Mock).mockReturnValue({});

    const { getByTestId } = renderSaveTimelineButton();

    getByTestId('timeline-modal-save-timeline').click();

    await waitFor(() => {
      expect(getByTestId('save-timeline-modal')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal')).toBeVisible();
    });
  });

  it('should disable the save timeline button when the user does not have write access', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false },
    });
    mockGetState.mockReturnValue(mockTimelineModel);

    const { getByTestId } = renderSaveTimelineButton();

    expect(getByTestId('timeline-modal-save-timeline')).toBeDisabled();
  });

  it('should disable the save timeline button when the timeline is immutable', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true },
    });
    mockGetState.mockReturnValue({ ...mockTimelineModel, status: TimelineStatusEnum.immutable });

    const { getByTestId } = renderSaveTimelineButton();

    expect(getByTestId('timeline-modal-save-timeline')).toBeDisabled();
  });
});

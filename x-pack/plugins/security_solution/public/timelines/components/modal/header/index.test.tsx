/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { TimelineModalHeader } from '.';
import { render } from '@testing-library/react';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useCreateTimeline } from '../../../hooks/use_create_timeline';
import { useInspect } from '../../../../common/components/inspect/use_inspect';
import { useKibana } from '../../../../common/lib/kibana';
import { timelineActions } from '../../../store';

jest.mock('../../../../sourcerer/containers');
jest.mock('../../../hooks/use_create_timeline');
jest.mock('../../../../common/components/inspect/use_inspect');
jest.mock('../../../../common/lib/kibana');

const mockGetState = jest.fn();
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
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

const timelineId = 'timeline-1';
const mockRef = {
  current: null,
};
const renderTimelineModalHeader = () =>
  render(
    <TestProviders>
      <TimelineModalHeader timelineId={timelineId} openToggleRef={mockRef} />
    </TestProviders>
  );

describe('TimelineModalHeader', () => {
  (useCreateTimeline as jest.Mock).mockReturnValue(jest.fn());
  (useInspect as jest.Mock).mockReturnValue(jest.fn());

  it('should render all dom elements', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      browserFields: {},
      indexPattern: { fields: [], title: '' },
    });

    const { getByTestId, getByText } = renderTimelineModalHeader();

    expect(getByTestId('timeline-favorite-empty-star')).toBeInTheDocument();
    expect(getByText('Untitled timeline')).toBeInTheDocument();
    expect(getByTestId('timeline-save-status')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-header-actions')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-new-timeline-dropdown-button')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-open-timeline-button')).toBeInTheDocument();
    expect(getByTestId('inspect-empty-button')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-save-timeline')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-header-close-button')).toBeInTheDocument();
  });

  it('should show attach to case if user has the correct permissions', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      browserFields: {},
      indexPattern: { fields: [], title: '' },
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              create: true,
              read: true,
            }),
          },
        },
        uiSettings: {
          get: jest.fn(),
        },
      },
    });

    const { getByTestId } = renderTimelineModalHeader();

    expect(getByTestId('timeline-modal-attach-to-case-dropdown-button')).toBeInTheDocument();
  });

  it('should call showTimeline action when closing timeline', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      browserFields: {},
      indexPattern: { fields: [], title: '' },
    });

    const spy = jest.spyOn(timelineActions, 'showTimeline');

    const { getByTestId } = renderTimelineModalHeader();

    getByTestId('timeline-modal-header-close-button').click();

    expect(spy).toHaveBeenCalledWith({
      id: timelineId,
      show: false,
    });
  });
});

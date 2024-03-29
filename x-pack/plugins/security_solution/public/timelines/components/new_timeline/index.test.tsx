/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { NewTimelineButton } from '.';
import { TimelineId } from '../../../../common/types';
import { timelineActions } from '../../store';
import { useDiscoverInTimelineContext } from '../../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { TimelineType } from '../../../../common/api/timeline';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../common/components/discover_in_timeline/use_discover_in_timeline_context');
jest.mock('../../../common/hooks/use_selector');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useSelector: jest.fn(),
    useDispatch: () => jest.fn(),
  };
});

const renderNewTimelineButton = (type: TimelineType) =>
  render(<NewTimelineButton type={type} />, { wrapper: TestProviders });

describe('NewTimelineButton', () => {
  const dataViewId = '';
  const selectedPatterns: string[] = [];
  (useDiscoverInTimelineContext as jest.Mock).mockReturnValue({
    resetDiscoverAppState: jest.fn(),
  });

  it('should render timeline button and call correct action when clicking on the button', async () => {
    const spy = jest.spyOn(timelineActions, 'createTimeline');

    const { getByTestId, queryByTestId, queryByText } = renderNewTimelineButton(
      TimelineType.default
    );

    const button = getByTestId('timelines-page-create-new-timeline');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Create new Timeline');

    expect(queryByTestId('timelines-page-create-new-timeline-template')).not.toBeInTheDocument();
    expect(queryByText('Create new timeline Template')).not.toBeInTheDocument();

    button.click();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        columns: defaultHeaders,
        dataViewId,
        id: TimelineId.active,
        indexNames: selectedPatterns,
        show: true,
        timelineType: TimelineType.default,
        updated: undefined,
      });
    });
  });

  it('should render timeline template button and call correct action when clicking on the button', async () => {
    const spy = jest.spyOn(timelineActions, 'createTimeline');

    const { getByTestId, queryByTestId, queryByText } = renderNewTimelineButton(
      TimelineType.template
    );

    const button = getByTestId('timelines-page-create-new-timeline-template');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Create new Timeline template');

    expect(queryByTestId('timelines-page-create-new-timeline')).not.toBeInTheDocument();
    expect(queryByText('Create new Timeline')).not.toBeInTheDocument();

    button.click();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        columns: defaultHeaders,
        dataViewId,
        id: TimelineId.active,
        indexNames: selectedPatterns,
        show: true,
        timelineType: TimelineType.template,
        updated: undefined,
      });
    });
  });
});

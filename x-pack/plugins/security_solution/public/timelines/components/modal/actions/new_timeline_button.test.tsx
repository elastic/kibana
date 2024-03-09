/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { NewTimelineButton } from './new_timeline_button';
import { TimelineId } from '../../../../../common/types';
import { timelineActions } from '../../../store';
import { defaultHeaders } from '../../timeline/body/column_headers/default_headers';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/components/discover_in_timeline/use_discover_in_timeline_context');
jest.mock('../../../../common/hooks/use_selector');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useSelector: jest.fn(),
    useDispatch: () => jest.fn(),
  };
});

const renderNewTimelineButton = () =>
  render(<NewTimelineButton timelineId={TimelineId.test} />, { wrapper: TestProviders });

describe('NewTimelineButton', () => {
  it('should render 2 options in the popover when clicking on the button', async () => {
    const { getByTestId, getByText } = renderNewTimelineButton();

    const button = getByTestId('timeline-modal-new-timeline-dropdown-button');

    expect(button).toBeInTheDocument();
    expect(getByText('New')).toBeInTheDocument();

    button.click();

    expect(getByTestId('timeline-modal-new-timeline')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-new-timeline')).toHaveTextContent('New Timeline');

    expect(getByTestId('timeline-modal-new-timeline-template')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-new-timeline-template')).toHaveTextContent(
      'New Timeline template'
    );
  });

  it('should call the correct action with clicking on the new timeline button', async () => {
    const dataViewId = '';
    const selectedPatterns: string[] = [];

    const spy = jest.spyOn(timelineActions, 'createTimeline');

    const { getByTestId } = renderNewTimelineButton();

    getByTestId('timeline-modal-new-timeline-dropdown-button').click();
    getByTestId('timeline-modal-new-timeline').click();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        columns: defaultHeaders,
        dataViewId,
        id: TimelineId.test,
        indexNames: selectedPatterns,
        show: true,
        timelineType: 'default',
        updated: undefined,
      });
    });
  });
});

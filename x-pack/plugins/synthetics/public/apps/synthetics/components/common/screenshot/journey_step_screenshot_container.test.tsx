/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import moment from 'moment';
import { JourneyStepScreenshotContainer } from './journey_step_screenshot_container';
import { render } from '../../../utils/testing';
import * as observabilityPublic from '@kbn/observability-plugin/public';
import { getShortTimeStamp } from '../../../utils/monitor_test_result/timestamp';
import '../../../utils/testing/__mocks__/use_composite_image.mock';
import { mockRef } from '../../../utils/testing/__mocks__/screenshot_ref.mock';
import * as retrieveHooks from '../monitor_test_result/use_retrieve_step_image';

jest.mock('@kbn/observability-plugin/public');

describe('JourneyStepScreenshotContainer', () => {
  let checkGroup: string;
  let timestamp: string;
  const { FETCH_STATUS } = observabilityPublic;

  beforeAll(() => {
    checkGroup = 'f58a484f-2ffb-11eb-9b35-025000000001';
    timestamp = '2020-11-26T15:28:56.896Z';
  });

  it.each([[FETCH_STATUS.PENDING], [FETCH_STATUS.LOADING]])(
    'displays spinner when loading step image',
    (fetchStatus) => {
      jest
        .spyOn(observabilityPublic, 'useFetcher')
        .mockReturnValue({ status: fetchStatus, data: null, refetch: () => null, loading: true });
      const { getByTestId } = render(
        <JourneyStepScreenshotContainer
          checkGroup={checkGroup}
          stepLabels={[getShortTimeStamp(moment(timestamp))]}
        />
      );
      expect(getByTestId('stepScreenshotPlaceholderLoading')).toBeInTheDocument();
    }
  );

  it('displays no image available when img src is unavailable and fetch status is successful', () => {
    jest
      .spyOn(observabilityPublic, 'useFetcher')
      .mockReturnValue({ status: FETCH_STATUS.SUCCESS, data: null, refetch: () => null });
    const { getByTestId } = render(
      <JourneyStepScreenshotContainer
        checkGroup={checkGroup}
        stepLabels={[getShortTimeStamp(moment(timestamp))]}
        allStepsLoaded={true}
      />
    );
    expect(getByTestId('stepScreenshotNotAvailable')).toBeInTheDocument();
  });

  it('displays image when img src is available from useFetcher', () => {
    const src = 'http://sample.com/sampleImageSrc.png';
    jest.spyOn(retrieveHooks, 'useRetrieveStepImage').mockReturnValue({
      loading: false,
      data: { maxSteps: 2, stepName: 'test', src },
      attempts: 1,
    });

    const { container } = render(
      <JourneyStepScreenshotContainer
        checkGroup={checkGroup}
        stepLabels={[getShortTimeStamp(moment(timestamp))]}
      />
    );
    expect(container.querySelector('img')?.src).toBe(src);
  });

  it('displays popover image when mouse enters img caption, and hides onLeave', async () => {
    const src = 'http://sample.com/sampleImageSrc.png';
    jest.spyOn(retrieveHooks, 'useRetrieveStepImage').mockReturnValue({
      loading: false,
      data: { maxSteps: 1, stepName: null, src },
      attempts: 1,
    });
    const { getByAltText, getAllByText, queryByAltText } = render(
      <JourneyStepScreenshotContainer
        checkGroup={checkGroup}
        stepLabels={[getShortTimeStamp(moment(timestamp))]}
      />
    );

    const caption = getAllByText('Nov 26, 2020 10:28:56 AM');
    fireEvent.mouseEnter(caption[0]);

    const altText = `A larger version of the screenshot for this journey step's thumbnail.`;

    await waitFor(() => getByAltText(altText));

    fireEvent.mouseLeave(caption[0]);

    await waitFor(() => expect(queryByAltText(altText)).toBeNull());
  });

  it('handles screenshot ref data', async () => {
    jest.spyOn(retrieveHooks, 'useRetrieveStepImage').mockReturnValue({
      loading: false,
      data: mockRef,
      attempts: 1,
    });

    const { getByAltText, getByText, getByRole, getAllByText, queryByAltText } = render(
      <JourneyStepScreenshotContainer
        checkGroup={checkGroup}
        stepLabels={[getShortTimeStamp(moment(timestamp))]}
      />
    );

    await waitFor(() => getByRole('img'));
    const caption = getAllByText('Nov 26, 2020 10:28:56 AM');
    fireEvent.mouseEnter(caption[0]);

    const altText = `A larger version of the screenshot for this journey step's thumbnail.`;

    await waitFor(() => getByAltText(altText));

    fireEvent.mouseLeave(caption[0]);

    await waitFor(() => expect(queryByAltText(altText)).toBeNull());
    expect(getByText('Step: 1 of 1'));
  });
});

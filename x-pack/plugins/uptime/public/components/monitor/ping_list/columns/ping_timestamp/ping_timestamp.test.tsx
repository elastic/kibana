/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { PingTimestamp } from './ping_timestamp';
import { mockReduxHooks } from '../../../../../lib/helper/test_helpers';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { Ping } from '../../../../../../common/runtime_types/ping';
import * as observabilityPublic from '../../../../../../../observability/public';

mockReduxHooks();

jest.mock('../../../../../../../observability/public', () => {
  const originalModule = jest.requireActual('../../../../../../../observability/public');

  return {
    ...originalModule,
    useFetcher: jest.fn().mockReturnValue({ data: null, status: 'pending' }),
  };
});

describe('Ping Timestamp component', () => {
  let response: Ping;
  const { FETCH_STATUS } = observabilityPublic;

  beforeAll(() => {
    response = {
      ecs: { version: '1.6.0' },
      agent: {
        ephemeral_id: '52ce1110-464f-4d74-b94c-3c051bf12589',
        id: '3ebcd3c2-f5c3-499e-8d86-80f98e5f4c08',
        name: 'docker-desktop',
        type: 'heartbeat',
        version: '7.10.0',
        hostname: 'docker-desktop',
      },
      monitor: {
        status: 'up',
        check_group: 'f58a484f-2ffb-11eb-9b35-025000000001',
        duration: { us: 1528598 },
        id: 'basic addition and completion of single task',
        name: 'basic addition and completion of single task',
        type: 'browser',
        timespan: { lt: '2020-11-26T15:29:56.820Z', gte: '2020-11-26T15:28:56.820Z' },
      },
      url: {
        full: 'file:///opt/elastic-synthetics/examples/todos/app/index.html',
        scheme: 'file',
        domain: '',
        path: '/opt/elastic-synthetics/examples/todos/app/index.html',
      },
      synthetics: { type: 'heartbeat/summary' },
      summary: { up: 1, down: 0 },
      timestamp: '2020-11-26T15:28:56.896Z',
      docId: '0WErBXYB0mvWTKLO-yQm',
    };
  });

  it.each([[FETCH_STATUS.PENDING], [FETCH_STATUS.LOADING]])(
    'displays spinner when loading step image',
    (fetchStatus) => {
      jest
        .spyOn(observabilityPublic, 'useFetcher')
        .mockReturnValue({ status: fetchStatus, data: null, refetch: () => null });
      const { getByTestId } = render(
        <PingTimestamp ping={response} timestamp={response.timestamp} />
      );
      expect(getByTestId('pingTimestampSpinner')).toBeInTheDocument();
    }
  );

  it('displays no image available when img src is unavailable and fetch status is successful', () => {
    jest
      .spyOn(observabilityPublic, 'useFetcher')
      .mockReturnValue({ status: FETCH_STATUS.SUCCESS, data: null, refetch: () => null });
    const { getByTestId } = render(
      <PingTimestamp ping={response} timestamp={response.timestamp} />
    );
    expect(getByTestId('pingTimestampNoImageAvailable')).toBeInTheDocument();
  });

  it('displays image when img src is available from useFetcher', () => {
    const src = 'http://sample.com/sampleImageSrc.png';
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { src },
      refetch: () => null,
    });
    const { container } = render(<PingTimestamp ping={response} timestamp={response.timestamp} />);
    expect(container.querySelector('img')?.src).toBe(src);
  });

  it('displays popover image when mouse enters img caption, and hides onLeave', async () => {
    const src = 'http://sample.com/sampleImageSrc.png';
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { src },
      refetch: () => null,
    });
    const { getByAltText, getByText, queryByAltText } = render(
      <PingTimestamp ping={response} timestamp={response.timestamp} />
    );
    const caption = getByText('Nov 26, 2020 10:28:56 AM');
    fireEvent.mouseEnter(caption);

    const altText = `A larger version of the screenshot for this journey step's thumbnail.`;

    await waitFor(() => getByAltText(altText));

    fireEvent.mouseLeave(caption);

    await waitFor(() => expect(queryByAltText(altText)).toBeNull());
  });
});

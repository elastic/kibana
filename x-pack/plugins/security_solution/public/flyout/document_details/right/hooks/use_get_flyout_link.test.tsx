/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetFlyoutLink } from './use_get_flyout_link';
import { useGetAppUrl } from '@kbn/security-solution-navigation';
import { ALERT_DETAILS_REDIRECT_PATH } from '../../../../../common/constants';

jest.mock('@kbn/security-solution-navigation');

const eventId = 'eventId';
const indexName = 'indexName';
const timestamp = 'timestamp';

describe('useGetFlyoutLink', () => {
  it('should return url', () => {
    (useGetAppUrl as jest.Mock).mockReturnValue({
      getAppUrl: (data: { path: string }) => data.path,
    });

    const hookResult = renderHook(() =>
      useGetFlyoutLink({
        eventId,
        indexName,
        timestamp,
      })
    );

    const origin = 'http://localhost';
    const path = `${ALERT_DETAILS_REDIRECT_PATH}/${eventId}?index=${indexName}&timestamp=${timestamp}`;
    expect(hookResult.result.current).toBe(`${origin}${path}`);
  });
});

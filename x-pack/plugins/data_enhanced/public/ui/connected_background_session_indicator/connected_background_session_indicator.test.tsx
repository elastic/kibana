/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { createConnectedBackgroundSessionIndicator } from './connected_background_session_indicator';
import { BehaviorSubject } from 'rxjs';
import { ISessionService } from '../../../../../../src/plugins/data/public';

const sessionService = dataPluginMock.createStartContract().search.session as jest.Mocked<
  ISessionService
>;

test("shouldn't show indicator in case no active search session", async () => {
  const BackgroundSessionIndicator = createConnectedBackgroundSessionIndicator({ sessionService });
  const { getByTestId, container } = render(<BackgroundSessionIndicator />);

  // make sure `backgroundSessionIndicator` isn't appearing after some time (lazy-loading)
  await expect(
    waitFor(() => getByTestId('backgroundSessionIndicator'), { timeout: 100 })
  ).rejects.toThrow();
  expect(container).toMatchInlineSnapshot(`<div />`);
});

test('should show indicator in case there is an active search session', async () => {
  const session$ = new BehaviorSubject('session_id');
  sessionService.getSession$.mockImplementation(() => session$);
  sessionService.getSessionId.mockImplementation(() => session$.getValue());
  const BackgroundSessionIndicator = createConnectedBackgroundSessionIndicator({ sessionService });
  const { getByTestId } = render(<BackgroundSessionIndicator />);

  await waitFor(() => getByTestId('backgroundSessionIndicator'));
});

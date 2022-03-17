/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import React from 'react';
import { BLOCKLIST_PATH } from '../../../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { Blocklist } from './blocklist';

describe('When on the blocklist page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<Blocklist />));

    act(() => {
      history.push(BLOCKLIST_PATH);
    });
  });

  describe('And no data exists', () => {
    it('should show the Empty message', async () => {
      render();
      await waitFor(() =>
        expect(renderResult.getByTestId('blocklistPage-emptyState')).toBeTruthy()
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockData } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { TTYOutputDeps, TTYOutput } from '.';

describe('TTYOutput component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const sessionLeader = mockData[0].events![0];
  const props: TTYOutputDeps = {
    sessionEntityId: sessionLeader.process!.entity_id!,
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When TTYOutput is mounted', () => {
    it('should', () => {
      renderResult = mockedContext.render(<TTYOutput {...props} />);
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
    });
  });
});

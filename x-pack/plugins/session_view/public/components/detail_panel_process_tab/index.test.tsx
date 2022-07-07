/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { sessionViewBasicProcessMock } from '../../../common/mocks/constants/session_view_process.mock';
import { DetailPanelProcessTab } from '.';

describe('DetailPanelProcessTab component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const processDetail = sessionViewBasicProcessMock.getDetails();
  const MOCK_PROCESS_END = '2021-11-24T15:25:04.210Z';

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelProcessTab is mounted', () => {
    it('renders DetailPanelProcessTab correctly', async () => {
      renderResult = mockedContext.render(
        <DetailPanelProcessTab
          selectedProcess={{
            ...sessionViewBasicProcessMock,
            getEndTime: () => MOCK_PROCESS_END,
          }}
        />
      );

      // Process detail rendered correctly
      expect(renderResult.queryByText(processDetail!.process!.entity_id!)).toBeVisible();
      expect(renderResult.queryByText(processDetail!.process!.start!)).toBeVisible();
      expect(renderResult.queryByText(MOCK_PROCESS_END)).toBeVisible();
      expect(renderResult.queryByText(processDetail!.process!.exit_code!)).toBeVisible();
      expect(renderResult.queryAllByText(processDetail!.process!.user!.name!)).toHaveLength(10);
      expect(renderResult.queryAllByText(processDetail!.process!.working_directory!)).toHaveLength(
        5
      );
      expect(renderResult.queryByText(`['bash']`)).toBeVisible();
      expect(renderResult.queryAllByText('/usr/bin/bash')).toHaveLength(5);
      expect(renderResult.queryByText('/usr/bin/vi')).toBeVisible();
      expect(renderResult.queryByText('(fork)')).toBeVisible();
      expect(renderResult.queryByText('(exec)')).toBeVisible();
      expect(renderResult.queryByText(processDetail!.process!.pid!)).toBeVisible();

      // Process tab accordions rendered correctly
      // TODO: revert back when we have jump to leaders button working
      // expect(renderResult.queryByText('entryLeader-name')).toBeVisible();
      // expect(renderResult.queryByText('sessionLeader-name')).toBeVisible();
      // expect(renderResult.queryByText('groupLeader-name')).toBeVisible();
      // expect(renderResult.queryByText('parent-name')).toBeVisible();
    });
  });
});

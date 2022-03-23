/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DetailPanelProcess, DetailPanelProcessLeader } from '../../types';
import { DetailPanelProcessTab } from './index';

const getLeaderDetail = (leader: string): DetailPanelProcessLeader => ({
  id: `${leader}-id`,
  name: `${leader}-name`,
  start: new Date('2022-02-24').toISOString(),
  entryMetaType: 'sshd',
  working_directory: '/home/jack',
  tty: {
    char_device: {
      major: 8,
      minor: 1,
    },
  },
  args: ['ls'],
  userName: `${leader}-jack`,
  groupName: `${leader}-jack-group`,
  pid: 1234,
  entryMetaSourceIp: '10.132.0.50',
  executable: '/usr/bin/bash',
});

const TEST_PROCESS_DETAIL: DetailPanelProcess = {
  id: 'process-id',
  start: new Date('2022-02-22').toISOString(),
  end: new Date('2022-02-23').toISOString(),
  exit_code: 137,
  userName: 'process-jack',
  groupName: 'process-jack-group',
  args: ['vi', 'test.txt'],
  executable: [
    ['test-executable-cmd', '(fork)'],
    ['test-executable-cmd', '(exec)'],
    ['test-executable-cmd', '(end)'],
  ],
  working_directory: '/home/jack',
  tty: {
    char_device: {
      major: 8,
      minor: 1,
    },
  },
  pid: 1233,
  entryLeader: getLeaderDetail('entryLeader'),
  sessionLeader: getLeaderDetail('sessionLeader'),
  groupLeader: getLeaderDetail('groupLeader'),
  parent: getLeaderDetail('parent'),
};

describe('DetailPanelProcessTab component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelProcessTab is mounted', () => {
    it('renders DetailPanelProcessTab correctly', async () => {
      renderResult = mockedContext.render(
        <DetailPanelProcessTab processDetail={TEST_PROCESS_DETAIL} />
      );

      // Process detail rendered correctly
      expect(renderResult.queryByText(TEST_PROCESS_DETAIL.id)).toBeVisible();
      expect(renderResult.queryByText(TEST_PROCESS_DETAIL.start)).toBeVisible();
      expect(renderResult.queryByText(TEST_PROCESS_DETAIL.end)).toBeVisible();
      expect(renderResult.queryByText(TEST_PROCESS_DETAIL.exit_code)).toBeVisible();
      expect(renderResult.queryByText(TEST_PROCESS_DETAIL.userName)).toBeVisible();
      expect(renderResult.queryByText(`['vi', 'test.txt']`)).toBeVisible();
      expect(renderResult.queryAllByText('test-executable-cmd')).toHaveLength(3);
      expect(renderResult.queryByText('(fork)')).toBeVisible();
      expect(renderResult.queryByText('(exec)')).toBeVisible();
      expect(renderResult.queryByText('(end)')).toBeVisible();
      expect(renderResult.queryByText(TEST_PROCESS_DETAIL.pid)).toBeVisible();

      // Process tab accordions rendered correctly
      expect(renderResult.queryByText('entryLeader-name')).toBeVisible();
      expect(renderResult.queryByText('sessionLeader-name')).toBeVisible();
      expect(renderResult.queryByText('groupLeader-name')).toBeVisible();
      expect(renderResult.queryByText('parent-name')).toBeVisible();
    });
  });
});

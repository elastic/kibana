/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessEventHost } from '../../../common/types/process_tree';
import { DetailPanelHostTab } from './index';

const TEST_ARCHITECTURE = 'x86_64';
const TEST_HOSTNAME = 'host-james-fleet-714-2';
const TEST_ID = '48c1b3f1ac5da4e0057fc9f60f4d1d5d';
const TEST_IP = '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809';
const TEST_MAC = '42:01:0a:84:00:32';
const TEST_NAME = 'name-james-fleet-714-2';
const TEST_OS_FAMILY = 'family-centos';
const TEST_OS_FULL = 'full-CentOS 7.9.2009';
const TEST_OS_KERNEL = '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021';
const TEST_OS_NAME = 'os-Linux';
const TEST_OS_PLATFORM = 'platform-centos';
const TEST_OS_VERSION = 'version-7.9.2009';

const TEST_HOST: ProcessEventHost = {
  architecture: TEST_ARCHITECTURE,
  hostname: TEST_HOSTNAME,
  id: TEST_ID,
  ip: TEST_IP,
  mac: TEST_MAC,
  name: TEST_NAME,
  os: {
    family: TEST_OS_FAMILY,
    full: TEST_OS_FULL,
    kernel: TEST_OS_KERNEL,
    name: TEST_OS_NAME,
    platform: TEST_OS_PLATFORM,
    version: TEST_OS_VERSION,
  },
};

describe('DetailPanelHostTab component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelHostTab is mounted', () => {
    it('renders DetailPanelHostTab correctly', async () => {
      renderResult = mockedContext.render(<DetailPanelHostTab processHost={TEST_HOST} />);

      expect(renderResult.queryByText('architecture')).toBeVisible();
      expect(renderResult.queryByText('hostname')).toBeVisible();
      expect(renderResult.queryByText('id')).toBeVisible();
      expect(renderResult.queryByText('ip')).toBeVisible();
      expect(renderResult.queryByText('mac')).toBeVisible();
      expect(renderResult.queryByText('name')).toBeVisible();
      expect(renderResult.queryByText(TEST_ARCHITECTURE)).toBeVisible();
      expect(renderResult.queryByText(TEST_HOSTNAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_ID)).toBeVisible();
      expect(renderResult.queryByText(TEST_IP)).toBeVisible();
      expect(renderResult.queryByText(TEST_MAC)).toBeVisible();
      expect(renderResult.queryByText(TEST_NAME)).toBeVisible();

      // expand host os accordion
      renderResult
        .queryByTestId('sessionView:detail-panel-accordion')
        ?.querySelector('button')
        ?.click();
      expect(renderResult.queryByText('os.family')).toBeVisible();
      expect(renderResult.queryByText('os.full')).toBeVisible();
      expect(renderResult.queryByText('os.kernel')).toBeVisible();
      expect(renderResult.queryByText('os.name')).toBeVisible();
      expect(renderResult.queryByText('os.platform')).toBeVisible();
      expect(renderResult.queryByText('os.version')).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_FAMILY)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_FULL)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_KERNEL)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_PLATFORM)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_VERSION)).toBeVisible();
    });
  });
});

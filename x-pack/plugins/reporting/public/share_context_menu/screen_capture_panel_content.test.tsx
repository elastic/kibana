/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { coreMock } from 'src/core/public/mocks';
import { BaseParams } from '../../common/types';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ScreenCapturePanelContent } from './screen_capture_panel_content';

const coreSetup = coreMock.createSetup();
const apiClient = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0');
const getJobParamsDefault: () => BaseParams = () => ({
  objectType: 'test-object-type',
  title: 'Test Report Title',
});

test('ScreenCapturePanelContent renders the default view properly', () => {
  const component = mountWithIntl(
    <ScreenCapturePanelContent
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      toasts={coreSetup.notifications.toasts}
      uiSettings={coreSetup.uiSettings}
      getJobParams={getJobParamsDefault}
    />
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
    `"http://localhost/api/reporting/generate/Analytical%20App?jobParams=%28layout%3A%28dimensions%3A%28height%3A768%2Cwidth%3A1024%29%2Cid%3Apreserve_layout%2Cselectors%3A%28itemsCountAttribute%3Adata-shared-items-count%2CrenderComplete%3A%5Bdata-shared-item%5D%2Cscreenshot%3A%5Bdata-shared-items-container%5D%2CtimefilterDurationAttribute%3Adata-shared-timefilter-duration%29%29%2CobjectType%3Atest-object-type%2Ctitle%3A%27Test%20Report%20Title%27%2Cversion%3A%277.15.0%27%29"`
  );
  expect(component.text()).not.toMatch('Full page layout');
  expect(component.text()).not.toMatch('Optimize for printing');
});

test('ScreenCapturePanelContent properly renders a view with "canvas" layout option', () => {
  const component = mountWithIntl(
    <ScreenCapturePanelContent
      layoutOption="canvas"
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      toasts={coreSetup.notifications.toasts}
      uiSettings={coreSetup.uiSettings}
      getJobParams={getJobParamsDefault}
    />
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).toMatch('Full page layout');
});

test('ScreenCapturePanelContent properly renders a view with "print" layout option', () => {
  const component = mountWithIntl(
    <ScreenCapturePanelContent
      layoutOption="print"
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      toasts={coreSetup.notifications.toasts}
      uiSettings={coreSetup.uiSettings}
      getJobParams={getJobParamsDefault}
    />
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).toMatch('Optimize for printing');
});

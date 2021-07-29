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
import { ScreenCapturePanelContent, Props } from './screen_capture_panel_content';

const { http, uiSettings, ...coreSetup } = coreMock.createSetup();
uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case 'dateFormat:tz':
      return 'Mars';
  }
});
const apiClient = new ReportingAPIClient(http, uiSettings, '7.15.0');

let jobParams: BaseParams;

describe('ScreenCapturePanelContent', () => {
  beforeEach(() => {
    jobParams = {
      objectType: 'test-object-type',
      title: 'Test Report Title',
    };
  });

  const mountComponent = (newProps: Partial<Props>) =>
    mountWithIntl(
      <ScreenCapturePanelContent
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        toasts={coreSetup.notifications.toasts}
        uiSettings={uiSettings}
        getJobParams={() => jobParams}
        {...newProps}
      />
    );

  test('renders the default view properly', () => {
    const component = mountComponent({});
    expect(component.find('EuiForm')).toMatchSnapshot();
    expect(component.text()).not.toMatch('Full page layout');
    expect(component.text()).not.toMatch('Optimize for printing');
  });

  test('properly renders a view with "canvas" layout option', () => {
    const component = mountComponent({
      layoutOption: 'canvas',
    });
    expect(component.find('EuiForm')).toMatchSnapshot();
    expect(component.text()).toMatch('Full page layout');
  });

  test('properly renders a view with "print" layout option', () => {
    const component = mountComponent({
      layoutOption: 'print',
    });
    expect(component.find('EuiForm')).toMatchSnapshot();
    expect(component.text()).toMatch('Optimize for printing');
  });

  test('decorated job params are visible in the POST URL', () => {
    jobParams.layout = { id: 'canvas' };
    const component = mountComponent({ layoutOption: 'canvas' });

    expect(component.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
      `"http://localhost/api/reporting/generate/Analytical%20App?jobParams=%28layout%3A%28dimensions%3A%28height%3A768%2Cwidth%3A1024%29%2Cid%3Acanvas%2Cselectors%3A%28itemsCountAttribute%3Adata-shared-items-count%2CrenderComplete%3A%5Bdata-shared-item%5D%2Cscreenshot%3A%5Bdata-shared-items-container%5D%2CtimefilterDurationAttribute%3Adata-shared-timefilter-duration%29%29%2CobjectType%3Atest-object-type%2Ctitle%3A%27Test%20Report%20Title%27%2Cversion%3A%277.15.0%27%29"`
    );
  });
});

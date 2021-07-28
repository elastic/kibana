/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { coreMock, notificationServiceMock, uiSettingsServiceMock } from 'src/core/public/mocks';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ReportingPanelContent, Props } from './reporting_panel_content';

const coreSetup = coreMock.createSetup();
const apiClient = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0-test');

describe('ReportingPanelContent', () => {
  const props: Partial<Props> = {
    layoutId: 'super_cool_layout_id_X',
  };
  const jobParams = {
    appState: 'very_cool_app_state_X',
    objectType: 'noice_object',
    title: 'ultimate_title',
  };

  beforeEach(() => {
    props.layoutId = 'super_cool_layout_id_X';
  });

  const mountComponent = (newProps: Partial<Props>) =>
    mountWithIntl(
      <ReportingPanelContent
        requiresSavedState
        isDirty={true} // We have unsaved changes
        reportType="test"
        objectId="my-object-id"
        layoutId={props.layoutId}
        getJobParams={() => jobParams}
        apiClient={apiClient}
        toasts={notificationServiceMock.createSetupContract().toasts}
        uiSettings={uiSettingsServiceMock.createSetupContract()}
        {...props}
        {...newProps}
      />
    );

  describe('saved state', () => {
    it('prevents generating reports when saving is required and we have unsaved changes', () => {
      const wrapper = mountComponent({
        requiresSavedState: true,
        isDirty: true,
        objectId: undefined,
      });
      wrapper.update();
      expect(wrapper.find('[data-test-subj="generateReportButton"]').last().props().disabled).toBe(
        true
      );
    });

    it('allows generating reports when saving is not required', () => {
      const wrapper = mountComponent({
        requiresSavedState: false,
        isDirty: true,
        objectId: undefined,
      });
      wrapper.update();
      expect(wrapper.find('[data-test-subj="generateReportButton"]').last().props().disabled).toBe(
        false
      );
    });

    it('changing the layout triggers refreshing the state with the latest job params', () => {
      const wrapper = mountComponent({ requiresSavedState: false });
      wrapper.update();
      expect(wrapper.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
        `"http://localhost/api/reporting/generate/test?jobParams=%28appState%3Avery_cool_app_state_X%2CobjectType%3Anoice_object%2Ctitle%3Aultimate_title%2Cversion%3A%277.15.0-test%27%29"`
      );

      // force the prop to update
      props.layoutId = 'super_cool_layout_id_Y';
      jobParams.appState = 'very_cool_app_state_Y';
      wrapper.setProps({ layoutId: 'super_cool_layout_id_Y' });
      wrapper.update();
      expect(wrapper.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
        `"http://localhost/api/reporting/generate/test?jobParams=%28appState%3Avery_cool_app_state_Y%2CobjectType%3Anoice_object%2Ctitle%3Aultimate_title%2Cversion%3A%277.15.0-test%27%29"`
      );
    });
  });
});

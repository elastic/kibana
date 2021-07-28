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
const apiClient = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0');

describe('ReportingPanelContent', () => {
  const mountComponent = (props: Partial<Props>) =>
    mountWithIntl(
      <ReportingPanelContent
        requiresSavedState
        // We have unsaved changes
        isDirty={true}
        reportType="test"
        layoutId="test"
        getJobParams={jest.fn().mockReturnValue({})}
        objectId={'my-object-id'}
        apiClient={apiClient}
        toasts={notificationServiceMock.createSetupContract().toasts}
        uiSettings={uiSettingsServiceMock.createSetupContract()}
        {...props}
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
      expect(wrapper.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
        `"http://localhost/api/reporting/generate/test?jobParams=%28version%3A%277.15.0%27%29"`
      );
    });
  });
});

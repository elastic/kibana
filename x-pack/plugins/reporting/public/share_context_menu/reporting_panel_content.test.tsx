/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { notificationServiceMock } from 'src/core/public/mocks';

import { ReportingPanelContent, Props } from './reporting_panel_content';

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
        apiClient={{ getReportingJobPath: () => 'test' } as any}
        toasts={notificationServiceMock.createSetupContract().toasts}
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
    });
  });
});

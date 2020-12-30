/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { ReportInfoButton } from './report_info_button';

jest.mock('../../lib/reporting_api_client');

import { ReportingAPIClient } from '../../lib/reporting_api_client';

const httpSetup = {} as any;
const apiClient = new ReportingAPIClient(httpSetup);

describe('ReportInfoButton', () => {
  it('handles button click flyout on click', () => {
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} jobId="abc-123" />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();
    expect(input).toMatchSnapshot();
  });

  it('opens flyout with info', async () => {
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} jobId="abc-456" />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(apiClient.getInfo).toHaveBeenCalledTimes(1);
    expect(apiClient.getInfo).toHaveBeenCalledWith('abc-456');
  });

  it('opens flyout with fetch error info', () => {
    // simulate fetch failure
    apiClient.getInfo = jest.fn(() => {
      throw new Error('Could not fetch the job info');
    });

    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} jobId="abc-789" />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(apiClient.getInfo).toHaveBeenCalledTimes(1);
    expect(apiClient.getInfo).toHaveBeenCalledWith('abc-789');
  });
});

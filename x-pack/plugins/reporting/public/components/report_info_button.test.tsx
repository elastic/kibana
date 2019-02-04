/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const mockJobQueueClient = { getInfo: jest.fn() };
jest.mock('../lib/job_queue_client', () => ({ jobQueueClient: mockJobQueueClient }));

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReportInfoButton } from './report_info_button';

describe('ReportInfoButton', () => {
  beforeEach(() => {
    mockJobQueueClient.getInfo = jest.fn(() => ({
      payload: { title: 'Test Job' },
    }));
  });

  it('handles button click flyout on click', () => {
    const wrapper = mountWithIntl(<ReportInfoButton jobId="abc-123" />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();
    expect(input).toMatchSnapshot();
  });

  it('opens flyout with info', () => {
    const wrapper = mountWithIntl(<ReportInfoButton jobId="abc-456" />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(mockJobQueueClient.getInfo).toHaveBeenCalledTimes(1);
    expect(mockJobQueueClient.getInfo).toHaveBeenCalledWith('abc-456');
  });

  it('opens flyout with fetch error info', () => {
    // simulate fetch failure
    mockJobQueueClient.getInfo = jest.fn(() => {
      throw new Error('Could not fetch the job info');
    });

    const wrapper = mountWithIntl(<ReportInfoButton jobId="abc-789" />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(mockJobQueueClient.getInfo).toHaveBeenCalledTimes(1);
    expect(mockJobQueueClient.getInfo).toHaveBeenCalledWith('abc-789');
  });
});

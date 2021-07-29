/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { coreMock } from '../../../../../src/core/public/mocks';
import { Job } from '../lib/job';
import { ReportInfoButton } from './report_info_button';

jest.mock('../lib/reporting_api_client');

import { ReportingAPIClient } from '../lib/reporting_api_client';

const coreSetup = coreMock.createSetup();
const apiClient = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0');

const job = new Job({
  id: 'abc-123',
  index: '.reporting-2020.04.12',
  migration_version: '7.15.0',
  attempts: 0,
  browser_type: 'chromium',
  created_at: '2020-04-14T21:01:13.064Z',
  created_by: 'elastic',
  jobtype: 'printable_pdf',
  max_attempts: 1,
  meta: { layout: 'preserve_layout', objectType: 'canvas workpad' },
  payload: {
    browserTimezone: 'America/Phoenix',
    version: '7.15.0-test',
    layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' },
    objectType: 'canvas workpad',
    title: 'My Canvas Workpad',
  },
  process_expiration: '1970-01-01T00:00:00.000Z',
  status: 'pending',
  timeout: 300000,
});

describe('ReportInfoButton', () => {
  it('handles button click flyout on click', () => {
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} job={job} />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();
    expect(input).toMatchSnapshot();
  });

  it('opens flyout with info', async () => {
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} job={job} />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(apiClient.getInfo).toHaveBeenCalledTimes(1);
    expect(apiClient.getInfo).toHaveBeenCalledWith('abc-123');
  });

  it('opens flyout with fetch error info', () => {
    // simulate fetch failure
    apiClient.getInfo = jest.fn(() => {
      throw new Error('Could not fetch the job info');
    });

    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} job={job} />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(apiClient.getInfo).toHaveBeenCalledTimes(1);
    expect(apiClient.getInfo).toHaveBeenCalledWith('abc-123');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { Job } from '../lib/job';
import { ReportInfoButton } from './report_info_button';

jest.mock('../lib/reporting_api_client');

import { ReportingAPIClient } from '../lib/reporting_api_client';

const httpSetup = {} as any;
const apiClient = new ReportingAPIClient(httpSetup);

describe('ReportInfoButton', () => {
  it('handles button click flyout on click', () => {
    const job = new Job({
      id: 'k90e51pk1ieucbae0c3t8wo2',
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
        layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' },
        objectType: 'canvas workpad',
        title: 'My Canvas Workpad',
      },
      process_expiration: '1970-01-01T00:00:00.000Z',
      status: 'pending',
      timeout: 300000,
    });
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} record={job} />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();
    expect(input).toMatchSnapshot();
  });

  it('opens flyout with info', async () => {
    const job = new Job({
      id: 'abc-456',
      index: '.reporting-2020.04.12',
      migration_version: '7.15.0',
      attempts: 1,
      browser_type: 'chromium',
      created_at: '2020-04-14T21:01:13.064Z',
      created_by: 'elastic',
      jobtype: 'printable_pdf',
      kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d',
      kibana_name: 'spicy.local',
      max_attempts: 1,
      meta: { layout: 'preserve_layout', objectType: 'canvas workpad' },
      payload: {
        browserTimezone: 'America/Phoenix',
        layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' },
        objectType: 'canvas workpad',
        title: 'My Canvas Workpad',
      },
      process_expiration: '2020-04-14T21:06:14.526Z',
      started_at: '2020-04-14T21:01:14.526Z',
      status: 'processing',
      timeout: 300000,
    });
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} record={job} />);
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

    const job = new Job({
      id: 'abc-789',
      index: '.reporting-2020.04.12',
      migration_version: '7.15.0',
      attempts: 1,
      browser_type: 'chromium',
      completed_at: '2020-04-14T20:19:14.748Z',
      created_at: '2020-04-14T20:19:02.977Z',
      created_by: 'elastic',
      jobtype: 'printable_pdf',
      kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d',
      kibana_name: 'spicy.local',
      max_attempts: 1,
      meta: { layout: 'preserve_layout', objectType: 'canvas workpad' },
      output: { content_type: 'application/pdf', size: 80262 },
      payload: {
        browserTimezone: 'America/Phoenix',
        layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' },
        objectType: 'canvas workpad',
        title: 'My Canvas Workpad',
      },
      process_expiration: '2020-04-14T20:24:04.073Z',
      started_at: '2020-04-14T20:19:04.073Z',
      status: 'completed',
      timeout: 300000,
    });
    const wrapper = mountWithIntl(<ReportInfoButton apiClient={apiClient} record={job} />);
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();

    input.simulate('click');

    const flyout = wrapper.find('[data-test-subj="reportInfoFlyout"]');
    expect(flyout).toMatchSnapshot();

    expect(apiClient.getInfo).toHaveBeenCalledTimes(1);
    expect(apiClient.getInfo).toHaveBeenCalledWith('abc-789');
  });
});

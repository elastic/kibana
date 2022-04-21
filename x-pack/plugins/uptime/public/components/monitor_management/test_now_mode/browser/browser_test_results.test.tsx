/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../../lib/helper/rtl_helpers';
import { kibanaService } from '../../../../state/kibana_service';
import * as runOnceHooks from './use_browser_run_once_monitors';
import { BrowserTestRunResult } from './browser_test_results';
import { fireEvent } from '@testing-library/dom';

describe('BrowserTestRunResult', function () {
  const onDone = jest.fn();
  let testId: string;

  beforeEach(() => {
    testId = 'test-id';
    jest.resetAllMocks();
  });

  it('should render properly', async function () {
    render(<BrowserTestRunResult monitorId={testId} isMonitorSaved={true} onDone={onDone} />);
    expect(await screen.findByText('Test result')).toBeInTheDocument();
    expect(await screen.findByText('0 steps completed')).toBeInTheDocument();
    const dataApi = (kibanaService.core as any).data.search;

    expect(dataApi.search).toHaveBeenCalledTimes(1);
    expect(dataApi.search).toHaveBeenLastCalledWith(
      {
        params: {
          body: {
            query: {
              bool: {
                filter: [
                  { term: { config_id: testId } },
                  {
                    terms: {
                      'synthetics.type': ['heartbeat/summary', 'journey/start'],
                    },
                  },
                ],
              },
            },
            sort: [{ '@timestamp': 'desc' }],
          },
          index: 'synthetics-*',
          size: 1000,
        },
      },
      {}
    );
  });

  it('should displays results', async function () {
    jest.spyOn(runOnceHooks, 'useBrowserRunOnceMonitors').mockReturnValue({
      data,
      stepListData: { steps: [stepEndDoc._source] } as any,
      loading: false,
      stepsLoading: false,
      journeyStarted: true,
      summaryDoc: summaryDoc._source,
      stepEnds: [stepEndDoc._source],
    });

    render(<BrowserTestRunResult monitorId={testId} isMonitorSaved={true} onDone={onDone} />);

    expect(await screen.findByText('Test result')).toBeInTheDocument();

    expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
    expect(await screen.findByText('Took 22 seconds')).toBeInTheDocument();
    expect(await screen.findByText('1 step completed')).toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('expandResults'));

    expect(await screen.findByText('Go to https://www.elastic.co/')).toBeInTheDocument();
    expect(await screen.findByText('21.8 seconds')).toBeInTheDocument();

    // Calls onDone on completion
    expect(onDone).toHaveBeenCalled();
  });
});

const journeyStartDoc = {
  _index: '.ds-synthetics-browser-default-2022.01.11-000002',
  _id: 'J1pLU34B6BrWThBwS4Fb',
  _score: null,
  _source: {
    agent: {
      name: 'job-78df368e085a796b-x9cbm',
      id: 'df497635-644b-43ba-97a6-2f4dce1ea93b',
      type: 'heartbeat',
      ephemeral_id: 'e24d9e65-ae5f-4088-9a79-01dd504a1403',
      version: '8.0.0',
    },
    package: { name: '@elastic/synthetics', version: '1.0.0-beta.17' },
    os: { platform: 'linux' },
    synthetics: {
      package_version: '1.0.0-beta.17',
      journey: { name: 'inline', id: 'inline' },
      payload: {
        source:
          'async ({ page, context, browser, params }) => {\n        scriptFn.apply(null, [core_1.step, page, context, browser, params, expect_1.expect]);\n    }',
        params: {},
      },
      index: 0,
      type: 'journey/start',
    },
    monitor: {
      name: 'Test Browser monitor - inline',
      id: '3e11e70a-41b9-472c-a465-7c9b76b1a085-inline',
      timespan: { lt: '2022-01-13T11:58:49.463Z', gte: '2022-01-13T11:55:49.463Z' },
      check_group: 'c01406bf-7467-11ec-9858-aa31996e0afe',
      type: 'browser',
    },
    '@timestamp': '2022-01-13T11:55:49.462Z',
    ecs: { version: '8.0.0' },
    config_id: '3e11e70a-41b9-472c-a465-7c9b76b1a085',
    data_stream: { namespace: 'default', type: 'synthetics', dataset: 'browser' },
    run_once: true,
    event: {
      agent_id_status: 'auth_metadata_missing',
      ingested: '2022-01-13T11:55:50Z',
      dataset: 'browser',
    },
  },
  sort: [1642074949462],
};

const summaryDoc: any = {
  _index: '.ds-synthetics-browser-default-2022.01.11-000002',
  _id: 'Ix5LU34BPllLwAMpqlfi',
  _score: null,
  _source: {
    summary: { up: 1, down: 0 },
    agent: {
      name: 'job-78df368e085a796b-x9cbm',
      id: 'df497635-644b-43ba-97a6-2f4dce1ea93b',
      type: 'heartbeat',
      ephemeral_id: 'e24d9e65-ae5f-4088-9a79-01dd504a1403',
      version: '8.0.0',
    },
    synthetics: {
      journey: { name: 'inline', id: 'inline', tags: null },
      type: 'heartbeat/summary',
    },
    monitor: {
      duration: { us: 21754383 },
      name: 'Test Browser monitor - inline',
      check_group: 'c01406bf-7467-11ec-9858-aa31996e0afe',
      id: '3e11e70a-41b9-472c-a465-7c9b76b1a085-inline',
      timespan: { lt: '2022-01-13T11:59:13.567Z', gte: '2022-01-13T11:56:13.567Z' },
      type: 'browser',
      status: 'up',
    },
    url: {
      path: '/',
      scheme: 'https',
      port: 443,
      domain: 'www.elastic.co',
      full: 'https://www.elastic.co/',
    },
    '@timestamp': '2022-01-13T11:56:11.217Z',
    ecs: { version: '8.0.0' },
    config_id: '3e11e70a-41b9-472c-a465-7c9b76b1a085',
    data_stream: { namespace: 'default', type: 'synthetics', dataset: 'browser' },
    run_once: true,
    event: {
      agent_id_status: 'auth_metadata_missing',
      ingested: '2022-01-13T11:56:14Z',
      dataset: 'browser',
    },
  },
  sort: [1642074971217],
};

const stepEndDoc: any = {
  _index: '.ds-synthetics-browser-default-2022.01.11-000002',
  _id: 'M1pLU34B6BrWThBwoIGk',
  _score: null,
  _source: {
    agent: {
      name: 'job-78df368e085a796b-x9cbm',
      id: 'df497635-644b-43ba-97a6-2f4dce1ea93b',
      ephemeral_id: 'e24d9e65-ae5f-4088-9a79-01dd504a1403',
      type: 'heartbeat',
      version: '8.0.0',
    },
    package: { name: '@elastic/synthetics', version: '1.0.0-beta.17' },
    os: { platform: 'linux' },
    synthetics: {
      package_version: '1.0.0-beta.17',
      journey: { name: 'inline', id: 'inline' },
      payload: {
        source: "async () => {\n  await page.goto('https://www.elastic.co/');\n}",
        url: 'https://www.elastic.co/',
        status: 'succeeded',
      },
      index: 12,
      step: {
        duration: { us: 21751370 },
        name: 'Go to https://www.elastic.co/',
        index: 1,
        status: 'succeeded',
      },
      type: 'step/end',
    },
    monitor: {
      name: 'Test Browser monitor - inline',
      id: '3e11e70a-41b9-472c-a465-7c9b76b1a085-inline',
      timespan: { lt: '2022-01-13T11:59:11.250Z', gte: '2022-01-13T11:56:11.250Z' },
      check_group: 'c01406bf-7467-11ec-9858-aa31996e0afe',
      type: 'browser',
    },
    url: {
      path: '/',
      scheme: 'https',
      port: 443,
      domain: 'www.elastic.co',
      full: 'https://www.elastic.co/',
    },
    '@timestamp': '2022-01-13T11:56:11.216Z',
    ecs: { version: '8.0.0' },
    config_id: '3e11e70a-41b9-472c-a465-7c9b76b1a085',
    data_stream: { namespace: 'default', type: 'synthetics', dataset: 'browser' },
    run_once: true,
    event: {
      agent_id_status: 'auth_metadata_missing',
      ingested: '2022-01-13T11:56:12Z',
      dataset: 'browser',
    },
  },
  sort: [1642074971216],
};

const data: any = {
  took: 4,
  timed_out: false,
  _shards: { total: 8, successful: 8, skipped: 2, failed: 0 },
  hits: {
    total: 3,
    max_score: null,
    hits: [journeyStartDoc, stepEndDoc, summaryDoc],
  },
};

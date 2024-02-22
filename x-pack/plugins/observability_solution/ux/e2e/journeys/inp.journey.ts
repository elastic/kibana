/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { Client } from '@elastic/elasticsearch';
import { recordVideo } from '../helpers/record_video';
import { loginToKibana, waitForLoadingToFinish } from './utils';

const addTestTransaction = async (params: any) => {
  const getService = params.getService;
  const es: Client = getService('es');

  const document = getPageLoad();

  const index = 'apm-8.0.0-transaction-000001';

  await es.index({
    index,
    document,
  });
  for (let i = 0; i < 100; i++) {
    await es.index({
      index,
      document: getPageExit(INP_VALUES[i]),
    });
  }
};

journey('INP', async ({ page, params }) => {
  recordVideo(page);

  before(async () => {
    await addTestTransaction(params);
    await waitForLoadingToFinish({ page });
  });

  const queryParams = {
    percentile: '50',
    rangeFrom: 'now-1y',
    rangeTo: 'now',
  };

  const queryString = new URLSearchParams(queryParams).toString();

  const baseUrl = `${params.kibanaUrl}/app/ux`;

  step('Go to UX Dashboard', async () => {
    await page.goto(`${baseUrl}?${queryString}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'viewer', password: 'changeme' },
    });
  });

  step('Check INP Values', async () => {
    expect(await page.$('text=Interaction to next paint'));
    await page.waitForSelector('[data-test-subj=inp-core-vital] > .euiTitle');
    await page.waitForSelector('text=381 ms');
  });
});

const getPageLoad = () => ({
  '@timestamp': new Date(Date.now()).toISOString(),
  agent: {
    name: 'rum-js',
    version: '5.1.1',
  },
  client: {
    geo: {
      continent_name: 'North America',
      country_iso_code: 'US',
      location: {
        lat: 37.751,
        lon: -97.822,
      },
    },
    ip: '151.101.130.217',
  },
  ecs: {
    version: '1.5.0',
  },
  event: {
    ingested: new Date(Date.now()).toISOString(),
    outcome: 'unknown',
  },
  http: {
    request: {
      referrer: '',
    },
    response: {
      decoded_body_size: 813,
      encoded_body_size: 813,
      transfer_size: 962,
    },
  },
  observer: {
    ephemeral_id: '863bfb71-dd0d-4033-833f-f9f3d3b71961',
    hostname: 'eb12315912f8',
    id: '23c1bdbb-6a2a-461a-a71f-6338116b5501',
    type: 'apm-server',
    version: '8.0.0',
    version_major: 8,
  },
  processor: {
    event: 'transaction',
    name: 'transaction',
  },
  service: {
    language: {
      name: 'javascript',
    },
    name: 'client',
    version: '1.0.0',
  },
  source: {
    ip: '151.101.130.217',
  },
  timestamp: {
    us: 1600080193349369,
  },
  trace: {
    id: 'd2f9a6f07ea467c68576ee45b97d9aec',
  },
  transaction: {
    custom: {
      userConfig: {
        featureFlags: ['double-trouble', '4423-hotfix'],
        showDashboard: true,
      },
    },
    duration: {
      us: 72584,
    },
    id: '8563bad355ff20f7',
    marks: {
      agent: {
        domComplete: 61,
        domInteractive: 51,
        timeToFirstByte: 3,
      },
      navigationTiming: {
        connectEnd: 1,
        connectStart: 1,
        domComplete: 61,
        domContentLoadedEventEnd: 51,
        domContentLoadedEventStart: 51,
        domInteractive: 51,
        domLoading: 9,
        domainLookupEnd: 1,
        domainLookupStart: 1,
        fetchStart: 0,
        loadEventEnd: 61,
        loadEventStart: 61,
        requestStart: 1,
        responseEnd: 4,
        responseStart: 3,
      },
    },
    name: '/products',
    page: {
      referer: '',
      url: 'http://opbeans-node:3000/products',
    },
    sampled: true,
    span_count: {
      started: 5,
    },
    type: 'page-load',
  },
  url: {
    domain: 'opbeans-node',
    full: 'http://opbeans-node:3000/products',
    original: 'http://opbeans-node:3000/products',
    path: '/products',
    port: 3000,
    scheme: 'http',
  },
  user: {
    email: 'arthur.dent@example.com',
    id: '1',
    name: 'arthurdent',
  },
  user_agent: {
    device: {
      name: 'Other',
    },
    name: 'Chrome',
    original:
      'Mozilla/5.0 (CrKey armv7l 1.5.16041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.0 Safari/537.36',
    os: {
      name: 'Chromecast',
    },
    version: '31.0.1650.0',
  },
});

const getPageExit = (inpValue: number = 200) => {
  const pageLoad = getPageLoad();

  return {
    ...pageLoad,
    transaction: {
      ...pageLoad.transaction,
      type: 'page-exit',
    },
    numeric_labels: {
      inp_value: inpValue,
    },
  };
};

const INP_VALUES = [
  482, 343, 404, 591, 545, 789, 664, 721, 442, 376, 797, 580, 749, 363, 673,
  141, 234, 638, 378, 448, 175, 543, 665, 146, 742, 686, 210, 324, 365, 192,
  301, 317, 728, 655, 427, 66, 741, 357, 732, 93, 592, 200, 636, 122, 695, 709,
  322, 296, 196, 188, 139, 346, 637, 315, 756, 139, 97, 411, 98, 695, 615, 394,
  619, 713, 100, 373, 730, 226, 270, 168, 740, 65, 215, 383, 614, 154, 645, 661,
  594, 71, 264, 377, 599, 92, 771, 474, 566, 106, 192, 491, 121, 210, 690, 310,
  753, 266, 289, 743, 134, 100,
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportingConfigType } from '../../config';
import { ConditionalHeaders } from '../../export_types/common';
import { createMockLayoutInstance, createMockLevelLogger } from '../../test_helpers';
import { LayoutInstance } from '../layouts';
import { ScreenshotObservableOpts } from './';
import { ScreenshotObservableHandler } from './observable_handler';

const logger = createMockLevelLogger();

describe('ScreenshotObservableHandler', () => {
  let captureConfig: ReportingConfigType['capture'];
  let layout: LayoutInstance;
  let conditionalHeaders: ConditionalHeaders;
  let opts: ScreenshotObservableOpts;

  beforeEach(() => {
    captureConfig = {
      timeouts: {
        openUrl: 30000,
        waitForElements: 30000,
        renderComplete: 30000,
      },
      loadDelay: 5000,
    } as unknown as typeof captureConfig;

    layout = createMockLayoutInstance(captureConfig);

    conditionalHeaders = {
      headers: { testHeader: 'testHeadValue' },
      conditions: {} as unknown as ConditionalHeaders['conditions'],
    };

    opts = {
      conditionalHeaders,
      layout,
      logger,
      urlsOrUrlLocatorTuples: [],
    };
  });

  it('instantiates', () => {
    const screenshots = new ScreenshotObservableHandler(captureConfig, opts);
    expect(screenshots).to.not.be(null);
  });
});

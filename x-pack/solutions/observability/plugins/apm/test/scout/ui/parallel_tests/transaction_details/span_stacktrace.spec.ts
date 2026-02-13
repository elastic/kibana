/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

const timeRange = {
  rangeFrom: testData.SPAN_LINKS_START_DATE,
  rangeTo: testData.SPAN_LINKS_END_DATE,
};

test.describe('Span stacktrace', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows APM agent generated stacktrace', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory('apm-generated', timeRange);
    await page.getByText('Transaction A').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('opens span flyout', async () => {
      await page.getByText('Span A').click();
    });

    await test.step('clicks stacktrace tab', async () => {
      await transactionDetailsPage.getStacktraceTab().click();
    });

    await test.step('shows Java APM agent stacktrace', async () => {
      await expect(
        page.getByText(
          'at org.apache.catalina.connector.OutputBuffer.flushByteBuffer(OutputBuffer.java:825)'
        )
      ).toBeVisible();
    });
  });

  test('shows Otel generated stacktrace', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory('otel-generated', timeRange);
    await page.getByText('Transaction A').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('opens span flyout', async () => {
      await page.getByText('Span A').click();
    });

    await test.step('clicks stacktrace tab', async () => {
      await transactionDetailsPage.getStacktraceTab().click();
    });

    await test.step('shows OpenTelemetry stacktrace', async () => {
      await expect(
        page.getByText(
          'java.lang.Throwable at co.elastic.otel.ElasticSpanProcessor.captureStackTrace(ElasticSpanProcessor.java:81)'
        )
      ).toBeVisible();
    });
  });
});

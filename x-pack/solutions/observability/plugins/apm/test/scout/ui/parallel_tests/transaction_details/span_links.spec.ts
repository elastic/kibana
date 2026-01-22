/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import {
  SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY,
  SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
} from '../../fixtures/constants';

const timeRange = {
  rangeFrom: testData.SPAN_LINKS_START_DATE,
  rangeTo: testData.SPAN_LINKS_END_DATE,
};

test.describe('Span links', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows span links for producer-internal-only Span A', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory(
      SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY,
      timeRange
    );
    await page.getByText('Transaction A').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('shows span links badge with correct count', async () => {
      await expect(page.getByText('2 Span links')).toBeVisible();
    });

    await test.step('shows tooltip with incoming/outgoing links', async () => {
      await page.getByRole('button', { name: 'Open span links details' }).hover();
      await expect(page.getByText('2 Span links found')).toBeVisible();
      await expect(page.getByText('2 incoming')).toBeVisible();
      await expect(page.getByText('0 outgoing')).toBeVisible();
    });

    await test.step('opens span flyout and shows span links details', async () => {
      await page.getByText('Span A').click();
      await transactionDetailsPage.getSpanLinksTab().click();

      const producerConsumerLink = page.getByRole('link', { name: 'zzz-producer-consumer' });
      await expect(producerConsumerLink).toBeVisible();
      await expect(producerConsumerLink).toHaveAttribute(
        'href',
        /\/services\/zzz-producer-consumer\/overview/
      );

      const transactionCLink = page.getByRole('link', { name: 'Transaction C' });
      await expect(transactionCLink).toBeVisible();

      const consumerMultipleLink = page.getByRole('link', {
        name: SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
      });
      await expect(consumerMultipleLink).toBeVisible();
      await expect(consumerMultipleLink).toHaveAttribute(
        'href',
        new RegExp(`/services/${SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE}/overview`)
      );

      const transactionDLink = page.getByRole('link', { name: 'Transaction D' });
      await expect(transactionDLink).toBeVisible();

      await expect(transactionDetailsPage.getSpanLinkTypeSelect()).toContainText(
        'Outgoing links (0)'
      );
    });
  });

  test('shows span links for producer-external-only Span B', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory('zzz-producer-external-only', timeRange);
    await page.getByText('Transaction B').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('shows span links badge with correct count', async () => {
      await expect(page.getByText('2 Span links')).toBeVisible();
    });

    await test.step('shows tooltip with incoming/outgoing links', async () => {
      await page.getByRole('button', { name: 'Open span links details' }).hover();
      await expect(page.getByText('2 Span links found')).toBeVisible();
      await expect(page.getByText('1 incoming')).toBeVisible();
      await expect(page.getByText('1 outgoing')).toBeVisible();
    });

    await test.step('opens span flyout and shows span links details', async () => {
      await page.locator('button').filter({ hasText: 'Span B100 ms' }).click();
      await transactionDetailsPage.getSpanLinksTab().click();

      const consumerMultipleLink = page.getByRole('link', {
        name: SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
      });
      await expect(consumerMultipleLink).toBeVisible();

      const spanELink = page.getByRole('link', { name: 'Span E' });
      await expect(spanELink).toBeVisible();

      await transactionDetailsPage.getSpanLinkTypeSelect().selectOption('Outgoing links (1)');
      // External links may not have service names, so we just verify the select shows the count
      await expect(transactionDetailsPage.getSpanLinkTypeSelect()).toContainText(
        'Outgoing links (1)'
      );
    });
  });

  test('shows span links flyout details on producer-consumer Transaction C', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory('zzz-producer-consumer', timeRange);
    await page.getByText('Transaction C').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('opens transaction flyout and shows span links', async () => {
      await page.getByRole('button', { name: '1 View details for' }).click();
      await transactionDetailsPage.getSpanLinksTab().click();

      const consumerMultipleLink = page.getByRole('link', {
        name: SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
      });
      await expect(consumerMultipleLink).toBeVisible();

      const spanELink = page.getByRole('link', { name: 'Span E' });
      await expect(spanELink).toBeVisible();
    });

    await test.step('switches to outgoing links and shows linked services', async () => {
      await transactionDetailsPage.getSpanLinkTypeSelect().selectOption('Outgoing links (1)');

      const producerInternalLink = page.getByRole('link', {
        name: SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY,
      });
      await expect(producerInternalLink).toBeVisible();

      const spanALink = page.getByRole('link', { name: 'Span A' });
      await expect(spanALink).toBeVisible();
    });
  });

  test('shows span links flyout details on consumer-multiple Transaction D', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory(
      SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
      timeRange
    );
    await page.getByText('Transaction D').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('opens transaction flyout and shows span links', async () => {
      await page.getByRole('button', { name: '1 View details for' }).click();
      await transactionDetailsPage.getSpanLinksTab().click();

      const producerConsumerLink = page.getByRole('link', { name: 'zzz-producer-consumer' });
      await expect(producerConsumerLink).toBeVisible();

      const spanCLink = page.getByRole('link', { name: 'Span C' });
      await expect(spanCLink).toBeVisible();

      const producerInternalLink = page.getByRole('link', {
        name: SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY,
      });
      await expect(producerInternalLink).toBeVisible();

      const spanALink = page.getByRole('link', { name: 'Span A' });
      await expect(spanALink).toBeVisible();

      await expect(transactionDetailsPage.getSpanLinkTypeSelect()).toContainText(
        'Incoming links (0)'
      );
    });
  });

  test('shows span links flyout details on consumer-multiple Span E', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.gotoServiceInventory(
      SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
      timeRange
    );
    await page.getByText('Transaction D').click();
    await page.waitForLoadingIndicatorHidden();

    await test.step('opens span flyout and shows span links', async () => {
      await page.getByText('Span E').click();
      await transactionDetailsPage.getSpanLinksTab().click();

      await expect(transactionDetailsPage.getSpanLinkTypeSelect()).toContainText(
        'Incoming links (0)'
      );
    });

    await test.step('switches to outgoing links and shows linked services', async () => {
      await transactionDetailsPage.getSpanLinkTypeSelect().selectOption('Outgoing links (2)');

      const producerExternalLink = page.getByRole('link', { name: 'zzz-producer-external-only' });
      await expect(producerExternalLink).toBeVisible();

      const spanBLink = page.getByRole('link', { name: 'Span B' });
      await expect(spanBLink).toBeVisible();

      const producerConsumerLink = page.getByRole('link', { name: 'zzz-producer-consumer' });
      await expect(producerConsumerLink).toBeVisible();

      const transactionCLink = page.getByRole('link', { name: 'Transaction C' });
      await expect(transactionCLink).toBeVisible();
    });
  });
});

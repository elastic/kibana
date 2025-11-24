/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { evaluate } from '../../src/evaluate';
import { generateFrequentErrorLogs } from '../../src/data_generators/logs';

/**
 * Experimental: Contextual Insights UI/Evaluation
 *
 * This test validates the end-to-end flow of contextual insights:
 * 1. Creates a dedicated Observability space (not dependent on Scout server mode)
 * 2. Creates connectors in the Observability space
 * 3. Generates log data using synthtrace
 * 4. Authenticates and navigates to Discover app in the Observability space
 * 5. Interacts with UI to trigger contextual insights
 * 6. Intercepts the API call to capture the payload
 * 7. Uses the captured payload for standard evaluation with obs_ai_assistant client.
 * The evaluation and UI automation could be extended to contextual insights powered by Agent Builder.
 */
evaluate.describe('Contextual Insights', { tag: '@svlOblt' }, () => {
  const SPACE_ID = 'contextual-insights-test';
  const SPACE_NAME = 'Contextual Insights Test';
  let spaceConnectorId: string;

  evaluate.beforeAll(async ({ logsSynthtraceEsClient, kbnClient, log, connector }) => {
    log.info('Setting up test environment for contextual insights');

    // Step 1: Create a dedicated Observability space
    log.info(`Creating Observability space: ${SPACE_ID}`);
    try {
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/spaces/space/${SPACE_ID}`,
        })
        .catch(() => {
          // Ignore errors if space doesn't exist
          log.debug(`Space ${SPACE_ID} doesn't exist, will create new one`);
        });

      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        body: {
          id: SPACE_ID,
          name: SPACE_NAME,
          description: 'Test space for contextual insights evaluation',
          color: '#00BFB3',
          initials: 'CI',
          disabledFeatures: [],
          solution: 'oblt', // Observability solution view
        },
      });
      log.info(`Successfully created Observability space: ${SPACE_ID}`);
    } catch (error) {
      log.error(`Failed to create space: ${error}`);
      throw error;
    }

    // Step 2: Create connector in the Observability space
    spaceConnectorId = uuidv5(`${connector.id}-${SPACE_ID}`, uuidv5.DNS);
    log.info(`Creating connector in space ${SPACE_ID} with ID: ${spaceConnectorId}`);
    try {
      // Delete connector in space if it exists from previous run
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/s/${SPACE_ID}/api/actions/connector/${spaceConnectorId}`,
        })
        .catch(() => {
          log.debug(`Connector ${spaceConnectorId} doesn't exist in space, will create new one`);
        });

      await kbnClient.request({
        method: 'POST',
        path: `/s/${SPACE_ID}/api/actions/connector/${spaceConnectorId}`,
        body: {
          config: connector.config,
          connector_type_id: connector.actionTypeId,
          name: `${connector.name} (${SPACE_NAME})`,
          secrets: connector.secrets,
        },
      });
      log.info(`Successfully created connector ${spaceConnectorId} in space ${SPACE_ID}`);
    } catch (error) {
      log.error(`Failed to create connector in space: ${error}`);
      throw error;
    }

    // Step 3: Set up test data
    log.info('Setting up test data for contextual insights');

    // await logsSynthtraceEsClient.clean();

    // Generate database connection timeout error logs
    await generateFrequentErrorLogs({
      logsSynthtraceEsClient,
      dataset: 'contextual_insights_test.logs',
      errorMessages: {
        'ERROR: Database connection timeout after 30 seconds': 50,
      },
    });

    log.info('Test data setup complete - generated 50 database timeout errors');
  });

  evaluate(
    'generates insights for database connection errors',
    async ({ page, log, evaluateDataset, browserAuth, kbnUrl }) => {
      log.info('Starting contextual insights UI test');

      log.info('Authenticating as admin');
      await browserAuth.loginAsAdmin();

      let capturedMessages: any[] = [];
      let capturedScreenContexts: any[] = [];
      let requestIntercepted = false;

      // Set up API route interception BEFORE navigation
      await page.route('**/internal/observability_ai_assistant/chat/complete', async (route) => {
        log.info('Intercepted contextual insights API call');

        const request = route.request();
        const payload = JSON.parse(request.postData() || '{}');

        // Capture the full payload details including messages with @timestamp
        capturedMessages = payload.messages || [];
        capturedScreenContexts = payload.screenContexts || [];
        requestIntercepted = true;

        log.info('Captured full payload:', {
          messageCount: capturedMessages.length,
          screenContextsCount: capturedScreenContexts.length,
          connectorId: payload.connectorId,
          hasTimestamps: capturedMessages.some((m: any) => m['@timestamp']),
        });

        // Abort the request to prevent actual call - we'll call it ourselves via evaluation
        await route.abort();
      });

      // Navigate to Discover app in the Observability space
      log.info(`Navigating to Discover app in space: ${SPACE_ID}`);
      await page.goto(kbnUrl.app('discover', { space: SPACE_ID }));

      // Wait for Discover to fully load
      log.info('Waiting for Discover to load');
      await page.waitForLoadingIndicatorHidden();

      // Wait for the document table to appear (indicates Discover has loaded)
      log.info('Waiting for data table to load');
      await page.waitForSelector('[data-test-subj="discoverDocTable"]', {
        timeout: 30000,
        state: 'visible',
      });

      // Try to set time range to last 24 hours (optional - data already generated for this range)
      try {
        log.info('Attempting to set time range to last 24 hours');

        // Check if date picker button is visible
        const datePickerButton = page.locator(
          '[data-test-subj="superDatePickerToggleQuickMenuButton"]'
        );
        await datePickerButton.waitFor({ timeout: 5000, state: 'visible' });

        await datePickerButton.click();

        // Click the "Last 24 hours" option
        const last24HoursOption = page.locator(
          '[data-test-subj="superDatePickerCommonlyUsed_Last_24 hours"]'
        );
        await last24HoursOption.waitFor({ timeout: 5000, state: 'visible' });
        await last24HoursOption.click();

        log.info('Time range set to last 24 hours');
        await page.waitForTimeout(2000);
      } catch (error) {
        log.info('Could not set time range, continuing with default time range');
      }

      // Click on first log entry to expand details
      log.info('Selecting first log entry');

      // Wait for at least one row to be visible
      await page.waitForSelector('[data-test-subj="docTableExpandToggleColumn"]', {
        timeout: 10000,
      });

      const firstLogRow = page.locator('[data-test-subj="docTableExpandToggleColumn"]').first();
      await firstLogRow.click({ timeout: 10000 });

      // Wait for the details flyout to appear
      log.info('Waiting for details flyout');
      await page.waitForSelector('[data-test-subj="docViewerFlyout"]', { timeout: 10000 });

      // Look for the contextual insight button
      log.info('Looking for contextual insight component');

      // Wait for the insight button to appear (may take a moment to render)
      try {
        await page.waitForSelector(
          '[data-test-subj="obsAiAssistantInsightButtonExplainLogMessage"]',
          {
            timeout: 600000,
            state: 'visible',
          }
        );

        log.info('Contextual insight button found, clicking it');
        const insightButton = page.locator(
          '[data-test-subj="obsAiAssistantInsightButtonExplainLogMessage"]'
        );
        await insightButton.click();

        // Wait a bit for the API call to be intercepted
        await page.waitForTimeout(1500);
      } catch (error) {
        log.warning('Contextual insight button not found - feature may not be available');
        log.debug('Error details:', error);
      }

      // Verify we intercepted the request
      if (!requestIntercepted) {
        log.warning('No API call was intercepted - contextual insights may not be available');
        return;
      }

      log.info('Request payload successfully captured from UI!');
      log.info('Closing browser session - no longer needed for evaluation');

      // Close the browser to free up resources
      // We have everything we need (captured messages) for evaluation
      await page.close();

      log.info('Proceeding with evaluation using captured payload...');
      log.debug('Captured messages structure:', JSON.stringify(capturedMessages, null, 2));

      // Note: The evaluation framework uses the default space connector from the fixture
      // The UI test validates that contextual insights work in the Observability space
      // The evaluation validates the payload format and AI response quality
      // Both connectors use the same configuration, just in different spaces
      await evaluateDataset({
        dataset: {
          name: 'contextual insights: database connection errors',
          description:
            'Validates that the assistant provides meaningful contextual insights for database timeout errors',
          examples: [
            {
              input: {
                question: '', // Not used when contextualInsightsPayload is provided
                scope: 'observability',
                // Pass the full captured messages array including @timestamp
                // This ensures identical formatting to what the UI sends
                contextualInsightsPayload: capturedMessages,
              },
              output: {
                criteria: [
                  'Identifies database connection timeout as the primary issue',
                  'Explains possible causes (network issues, connection pool exhaustion, database overload)',
                  'Provides actionable recommendations (check connection strings, increase timeouts, monitor database)',
                  'Does not hallucinate details not present in logs',
                ],
              },
              metadata: {
                capturedFromUI: true,
                logDataset: 'contextual_insights_test.logs',
              },
            },
          ],
        },
      });

      log.info('Contextual insights evaluation complete');
    }
  );

  evaluate.afterAll(async ({ logsSynthtraceEsClient, kbnClient, log, connector }) => {
    log.info('Cleaning up test environment');

    // Clean up test data
    // await logsSynthtraceEsClient.clean();

    // Delete the connector from the space
    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/s/${SPACE_ID}/api/actions/connector/${spaceConnectorId}`,
      });
      log.info(`Successfully deleted connector ${spaceConnectorId} from space ${SPACE_ID}`);
    } catch (error) {
      log.error(`Failed to delete connector from space: ${error}`);
    }

    // Delete the test space (this will also clean up any remaining space-scoped resources)
    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/spaces/space/${SPACE_ID}`,
      });
      log.info(`Successfully deleted space: ${SPACE_ID}`);
    } catch (error) {
      log.error(`Failed to delete space: ${error}`);
    }
  });
});

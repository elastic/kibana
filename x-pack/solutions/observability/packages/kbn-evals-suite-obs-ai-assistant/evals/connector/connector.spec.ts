/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { EXECUTE_CONNECTOR_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/common';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import { evaluate } from '../../src/evaluate';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/connector/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

const EMAIL_PROMPT =
  'Send an email to user@test.com with the subject "Test Email" and body "This is a test email."';

const EMAIL_EVAL_CRITERIA = [
  `Uses the ${EXECUTE_CONNECTOR_FUNCTION_NAME} function to send the email before providing a final answer to the user.`,
  'Clearly explains to the user that an email will be sent and summarizes the provided details (recipient, subject, body).',
  'Confirms successful email delivery and includes the recipient, subject, and message in the summary.',
  'Does not include irrelevant or unrelated information in the response.',
];

evaluate.describe(
  'execute_connector function',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate.describe('no email connector available', () => {
      evaluate('does not send an email and fails gracefully', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'connector: no email connector',
            description: 'Validate behavior when no Actions email connector exists.',
            examples: [
              {
                input: { question: EMAIL_PROMPT },
                output: {
                  criteria: [
                    `Does not use ${EXECUTE_CONNECTOR_FUNCTION_NAME} function.`,
                    'Explains that no connectors are available to send the email.',
                    'Does not attempt to send an email.',
                    'Mentions that sending the email was unsuccessful.',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      });
    });

    evaluate.describe('with email connector', () => {
      let emailConnectorId: string;

      evaluate.beforeAll(async ({ kbnClient, log }) => {
        const { data } = await kbnClient.request<ActionConnector>({
          method: 'POST',
          path: '/api/actions/connector',
          body: {
            name: 'email-connector-test',
            config: {
              from: 'test@example.com',
              service: '__json',
            },
            secrets: {
              user: 'test',
              password: '123456',
            },
            connector_type_id: '.email',
          },
        });
        log.success('Email connector created successfully');

        emailConnectorId = data.id;
      });

      evaluate('sends an email (basic)', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'connector: with email connector (basic)',
            description:
              'Validates that the assistant uses execute_connector and summarizes correctly.',
            examples: [
              {
                input: { question: EMAIL_PROMPT },
                output: { criteria: EMAIL_EVAL_CRITERIA },
                metadata: {},
              },
            ],
          },
        });
      });

      evaluate('sends an email using user instructions', async ({ evaluateDataset, kbnClient }) => {
        const instructions = `<email_instructions>
      If the user's query requires sending an email:
      1. Use the email connector type ".email" with ID "${emailConnectorId}".
      2. Prepare the email parameters:
        - Recipient email address(es) in the "to" field (array of strings)
        - Subject in the "subject" field (string)
        - Email body in the "message" field (string)
      3. Include
        - Details for the alert along with a link to the alert
        - Root cause analysis
        - All of the details we discussed in this conversation
        - Remediation recommendations
        - Link to Business Health Dashboard
      4. Execute the connector using this format:
        execute_connector(
          id="${emailConnectorId}",
          params={
            "to": ["recipient@example.com"],
            "subject": "Your Email Subject",
            "message": "Your email content here."
          }
        )
      5. Check the response and confirm if the email was sent successfully.
  </email_instructions>`;

        await kbnClient.request({
          method: 'PUT',
          path: '/internal/observability_ai_assistant/kb/user_instructions',
          body: { id: 'send_email', text: instructions, public: false },
        });

        await evaluateDataset({
          dataset: {
            name: 'connector: with email connector (user instructions)',
            description: 'Validates connector usage guided by user instructions.',
            examples: [
              {
                input: { question: EMAIL_PROMPT },
                output: { criteria: EMAIL_EVAL_CRITERIA },
                metadata: {},
              },
            ],
          },
        });
      });

      evaluate.afterAll(async ({ kbnClient, log }) => {
        // Delete the email connector
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/actions/connector/${emailConnectorId}`,
        });
        log.success('Email connector deleted');
        // Delete the user instructions
        await kbnClient.request({
          method: 'DELETE',
          path: '/internal/observability_ai_assistant/kb/entries/send_email',
        });
        log.success('User instructions deleted');
      });
    });
  }
);

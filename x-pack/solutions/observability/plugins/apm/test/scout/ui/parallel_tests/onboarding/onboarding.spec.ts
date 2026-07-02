/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const AGENTS = ['Node.js', 'Django', 'Flask', 'Ruby on Rails', 'Rack', 'Go', 'Java', '.NET', 'PHP'];

const AGENT_SNIPPETS: Array<{ agent: string; snippet: string }> = [
  { agent: 'Django', snippet: 'pip install elastic-apm' },
  { agent: 'Flask', snippet: 'pip install elastic-apm[flask]' },
  { agent: 'Ruby on Rails', snippet: "gem 'elastic-apm'" },
  { agent: 'Rack', snippet: "gem 'elastic-apm'" },
  { agent: 'Go', snippet: 'go get go.elastic.co/apm' },
  { agent: 'Java', snippet: '-javaagent' },
  { agent: '.NET', snippet: 'Elastic.Apm.NetCoreAll' },
  { agent: 'PHP', snippet: 'apk add --allow-untrusted <package-file>.apk' },
];

test.describe('APM Onboarding', { tag: tags.stateful.classic }, () => {
  test('includes a section for APM Agents', async ({
    browserAuth,
    page,
    pageObjects: { onboardingPage },
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await onboardingPage.goto();

    await expect(page.getByText('APM Agents')).toBeVisible();
    for (const agent of AGENTS) {
      await expect(page.getByRole('tab', { name: agent, exact: true })).toBeVisible();
    }
  });

  test('navigates between agent tabs and shows the install snippet', async ({
    browserAuth,
    page,
    pageObjects: { onboardingPage },
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await onboardingPage.goto();

    for (const { agent, snippet } of AGENT_SNIPPETS) {
      await test.step(`shows the ${agent} snippet`, async () => {
        await onboardingPage.selectAgent(agent);
        await expect(page.getByText(snippet)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    }
  });

  test('shows the agent status success callout when APM data is present', async ({
    browserAuth,
    pageObjects: { onboardingPage },
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await onboardingPage.goto();

    // The shared lane is always seeded with recent APM data.
    await onboardingPage.checkAgentStatusButton.click();
    await expect(onboardingPage.getCallout('agentStatusSuccessCallout')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('creates an API key successfully with the right privileges', async ({
    browserAuth,
    pageObjects: { onboardingPage },
  }) => {
    test.setTimeout(120000);

    // Creating an agent key requires the `apm` application privilege
    // (`event:write`) plus `manage_own_api_key`. These are Elasticsearch
    // application privileges that the Kibana role API can't grant, so we use
    // the built-in superuser (the route itself suggests using superuser).
    await browserAuth.loginWithBuiltInRole('superuser');
    await onboardingPage.goto();

    await onboardingPage.createApiKeyButton.click();
    await expect(onboardingPage.getCallout('apiKeySuccessCallout')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });

    await test.step('the success callout persists when switching agents', async () => {
      await onboardingPage.selectAgent('Django');
      await expect(onboardingPage.getCallout('apiKeySuccessCallout')).toBeVisible();
      await onboardingPage.selectAgent('Java');
      await expect(onboardingPage.getCallout('apiKeySuccessCallout')).toBeVisible();
    });
  });

  test('shows a warning callout when API key privileges are missing', async ({
    browserAuth,
    pageObjects: { onboardingPage },
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await onboardingPage.goto();

    await onboardingPage.createApiKeyButton.click();
    await expect(onboardingPage.getCallout('apiKeyWarningCallout')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const ES_LOGSTASH_READ = {
  cluster: [],
  indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
};

const globalApmAll: KibanaRole = {
  elasticsearch: ES_LOGSTASH_READ,
  kibana: [{ base: [], feature: { apm: ['all'] }, spaces: ['*'] }],
};

const globalApmRead: KibanaRole = {
  elasticsearch: ES_LOGSTASH_READ,
  kibana: [{ base: [], feature: { apm: ['read'] }, spaces: ['*'] }],
};

const noApmPrivileges: KibanaRole = {
  elasticsearch: ES_LOGSTASH_READ,
  kibana: [{ base: [], feature: { dashboard: ['all'] }, spaces: ['*'] }],
};

test.describe('APM feature controls - security', { tag: tags.stateful.classic }, () => {
  test('with global apm all privileges shows the Applications nav link and can navigate to APM', async ({
    browserAuth,
    pageObjects: { featureControlsPage },
  }) => {
    await browserAuth.loginWithCustomRole(globalApmAll);
    await featureControlsPage.gotoApm();
    await featureControlsPage.waitForApmToLoad();
    await expect(featureControlsPage.apmMainContainer).toBeVisible();
  });

  test('with global apm all privileges does not show the read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage },
  }) => {
    await browserAuth.loginWithCustomRole(globalApmAll);
    await featureControlsPage.gotoApm();
    await featureControlsPage.waitForApmToLoad();
    await expect(featureControlsPage.readOnlyBadge).toBeHidden();
  });

  test('with global apm read-only privileges can navigate to APM and shows the read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage },
  }) => {
    await browserAuth.loginWithCustomRole(globalApmRead);
    await featureControlsPage.gotoApm();
    await featureControlsPage.waitForApmToLoad();
    await expect(featureControlsPage.readOnlyBadge).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    await expect(featureControlsPage.readOnlyBadge).toHaveAttribute(
      'data-test-badge-label',
      'Read only'
    );
  });

  test('with no apm privileges renders the no-permission page', async ({
    browserAuth,
    page,
    pageObjects: { featureControlsPage },
  }) => {
    await browserAuth.loginWithCustomRole(noApmPrivileges);
    await featureControlsPage.gotoApm();
    await expect(
      page.getByText('You do not have permission to access the requested page')
    ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { waitForApmSettingsHeaderLink } from '../page_helpers';

export class ServiceGroupsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  /**
   * Removes any leftover service group with the given name so the "no service
   * groups initially" assertion is reliable across retries and shared lanes.
   */
  async deleteServiceGroupsByName(kbnClient: KbnClient, groupName: string) {
    const { data } = await kbnClient.request<{
      serviceGroups: Array<{ id: string; groupName: string }>;
    }>({
      method: 'GET',
      path: '/internal/apm/service-groups',
    });

    const matches = data.serviceGroups.filter((group) => group.groupName === groupName);

    for (const { id } of matches) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/internal/apm/service-group?serviceGroupId=${id}`,
        headers: { 'kbn-xsrf': 'scout' },
      });
    }
  }

  async gotoServiceGroupsPageWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-groups?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async typeInTheSearchBar(text: string) {
    await this.page.getByText('Select services').click();
    const kuery = this.page.getByTestId('headerFilterKuerybar');
    await expect(kuery).toBeVisible();
    await kuery.fill(text);
    await this.page.getByTestId('apmSelectServicesButton').click();
  }

  async createNewServiceGroup(name: string) {
    await this.page.getByTestId('apmCreateServiceGroupButton').click();
    const groupNameInput = this.page.getByTestId('apmGroupNameInput');
    await expect(groupNameInput).toBeVisible();
    await groupNameInput.fill(name);
    await groupNameInput.press('Enter');
  }
  async expectByText(texts: string[]) {
    for (const text of texts) {
      await expect(this.page.getByText(text)).toBeVisible();
    }
  }
}

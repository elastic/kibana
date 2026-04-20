/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class ObservabilityNavigation {
  public readonly sidenav: Locator;
  public readonly primaryNav: Locator;
  public readonly footerNav: Locator;
  public readonly morePopover: Locator;

  constructor(private readonly page: ScoutPage) {
    this.sidenav = this.page.testSubj.locator('kbnChromeLayoutNavigation');
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.footerNav = this.page.testSubj.locator('kbnChromeNav-footer');
    this.morePopover = this.page.testSubj.locator('side-nav-popover-More');
  }

  async goto() {
    await this.page.gotoApp('observability');
  }

  async gotoLanding() {
    await this.page.gotoApp('observability/landing');
  }

  async waitForLoad() {
    await expect(this.primaryNav).toBeVisible();
  }

  pageOrNoData(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj).or(this.page.testSubj.locator('kbnNoDataPage'));
  }

  navItemInPrimaryByDeepLinkId(deepLinkId: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInPrimaryById(id: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  navItemInBodyByDeepLinkId(deepLinkId: string): Locator {
    const selector = `[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`;
    return this.primaryNav.locator(selector).or(this.morePopover.locator(selector));
  }

  navItemInBodyById(id: string): Locator {
    const selector = `[data-test-subj~="nav-item-id-${id}"]`;
    return this.primaryNav.locator(selector).or(this.morePopover.locator(selector));
  }

  navItemInFooterByDeepLinkId(deepLinkId: string): Locator {
    return this.footerNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInFooterById(id: string): Locator {
    return this.footerNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  navItemInMoreByDeepLinkId(deepLinkId: string): Locator {
    return this.morePopover.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInMoreById(id: string): Locator {
    return this.morePopover.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  async expectNavItemHasHref(item: Locator) {
    await expect(item).toHaveAttribute('href', /.+/);
  }

  async expectNavItemNavigatesTo(item: Locator, landing: Locator) {
    await item.click();
    await expect(landing).toBeVisible();
  }
}

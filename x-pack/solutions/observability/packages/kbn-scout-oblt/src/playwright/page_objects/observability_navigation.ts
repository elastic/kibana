/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Chrome nav for Observability — locators and actions only; specs own `expect`. */
export class ObservabilityNavigation {
  public readonly sidenav: Locator;
  public readonly primaryNav: Locator;
  public readonly footerNav: Locator;
  public readonly morePopover: Locator;
  public readonly breadcrumbs: Locator;
  public readonly logo: Locator;
  public readonly moreMenuTrigger: Locator;

  constructor(private readonly page: ScoutPage) {
    this.sidenav = this.page.testSubj.locator('kbnChromeLayoutNavigation');
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.footerNav = this.page.testSubj.locator('kbnChromeNav-footer');
    this.morePopover = this.page.testSubj.locator('side-nav-popover-More');
    this.breadcrumbs = this.page.testSubj.locator('breadcrumbs');
    this.logo = this.page.testSubj.locator('nav-header-logo');
    this.moreMenuTrigger = this.page.testSubj.locator('kbnChromeNav-moreMenuTrigger');
  }

  /** `goto*` does not call `waitForLoad()` — sidenav may be absent (e.g. classic chrome); call `waitForLoad()` when interacting with nav. */
  async goto() {
    await this.page.gotoApp('observability');
  }

  async gotoLanding() {
    await this.page.gotoApp('observability/landing');
  }

  async gotoApp(appName: string) {
    await this.page.gotoApp(appName);
  }

  /** Waits on `primaryNav` (outer layout can be 0-width until CSS vars apply). */
  async waitForLoad() {
    await this.primaryNav.waitFor({ state: 'visible' });
  }

  /** App root or `kbnNoDataPage` (Discover/Dashboards with no data views). */
  pageOrNoData(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj).or(this.page.testSubj.locator('kbnNoDataPage'));
  }

  navItemInPrimaryByDeepLinkId(deepLinkId: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInPrimaryById(id: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  /** Primary or More — for overflow-dependent placement; prefer scoped helpers when fixed. */
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

  navItemInSidenavByDeepLinkId(deepLinkId: string): Locator {
    return this.sidenav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInSidenavById(id: string): Locator {
    return this.sidenav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  /** Item with `nav-item-isActive` in test-subj (current route). */
  activeNavItemByDeepLinkId(deepLinkId: string): Locator {
    return this.sidenav.locator(
      `[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"][data-test-subj~="nav-item-isActive"]`
    );
  }

  activeNavItemById(id: string): Locator {
    return this.sidenav.locator(
      `[data-test-subj~="nav-item-id-${id}"][data-test-subj~="nav-item-isActive"]`
    );
  }

  sidePanel(id: string): Locator {
    return this.page.testSubj.locator(`~kbnChromeNav-sidePanel_${id}`);
  }

  nestedPanel(id: string): Locator {
    return this.morePopover.locator(`[data-test-subj="kbnChromeNav-nestedPanel-${id}"]`);
  }

  anyPanel(id: string): Locator {
    return this.sidePanel(id).or(this.nestedPanel(id));
  }

  /** By `breadcrumb-deepLinkId-*` test-subj or visible text. */
  breadcrumb(by: { deepLinkId: string } | { text: string }): Locator {
    if ('deepLinkId' in by) {
      return this.breadcrumbs.locator(`[data-test-subj~="breadcrumb-deepLinkId-${by.deepLinkId}"]`);
    }
    return this.breadcrumbs.locator('[data-test-subj~="breadcrumb"]', { hasText: by.text });
  }

  /** If More is already open, Escape first so the next open is the root list. */
  async openMoreMenu() {
    if (await this.morePopover.isVisible()) {
      await this.page.keyboard.press('Escape');
      await this.morePopover.waitFor({ state: 'hidden' });
    }
    await this.moreMenuTrigger.click();
    await this.morePopover.waitFor({ state: 'visible' });
  }

  async clickLogo() {
    await this.logo.click();
  }

  /** Returns a function that is false after a full page reload (spec asserts). */
  async createNoPageReloadCheck(): Promise<() => Promise<boolean>> {
    const trackReloadTs = Date.now();
    await this.page.evaluate((ts: number) => {
      (window as unknown as { __testTrackReload__?: number }).__testTrackReload__ = ts;
    }, trackReloadTs);

    return async () => {
      return this.page.evaluate((ts: number) => {
        const w = window as unknown as { __testTrackReload__?: number };
        return w.__testTrackReload__ === ts;
      }, trackReloadTs);
    };
  }
}

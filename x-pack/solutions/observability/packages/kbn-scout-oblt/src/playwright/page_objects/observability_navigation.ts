/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Shared page object for the Observability solution sidenav. Used by both
 * serverless_observability and the stateful observability plugin. Helpers are
 * container-scoped (primary nav vs footer vs the "More" popover) so that tests
 * fail loudly if an item unexpectedly migrates between locations.
 *
 * Assertions live in the specs (see docs/extend/scout/ui-best-practices.md,
 * "Keep assertions explicit in tests, not hidden in page objects"); this class
 * only exposes locators, navigation actions, and waits.
 */
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

  /**
   * Waits for the sidenav to be hydrated and interactive. We sync on
   * `primaryNav` rather than the outer layout container because the layout
   * div can briefly render with 0 width (flagged "hidden" by Playwright)
   * before `useSideNavWidth` populates its CSS variable.
   */
  async waitForLoad() {
    await this.primaryNav.waitFor({ state: 'visible' });
  }

  /**
   * Returns a locator matching either the expected page element or the no-data page.
   * Apps like Discover/Dashboards show a no-data prompt when no data views exist.
   */
  pageOrNoData(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj).or(this.page.testSubj.locator('kbnNoDataPage'));
  }

  navItemInPrimaryByDeepLinkId(deepLinkId: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInPrimaryById(id: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  /**
   * Look up a body nav item anywhere in the sidenav body (primary column
   * or the "More" popover). Use this for items whose placement depends on
   * overflow (e.g. when a tier exposes fewer items, the same item may fit
   * in primary instead of spilling into "More" while other items still
   * overflow). Prefer the primary / more scoped helpers whenever the position
   * is deterministic.
   */
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
}

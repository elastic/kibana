/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/** Serverless / cloud: primary chrome nav can lag behind Playwright defaults (gh-267186). */
export const OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS = 45_000;

/**
 * Budget for app shells after sidenav navigations — bundles + async `data-test-subj` (ex. dashboards
 * listing mounts `dashboardLandingPage` in an effect; gh-267186 comment).
 */
export const OBSERVABILITY_SPA_SHELL_TIMEOUT_MS = OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS;

/** Per-attempt budget while retrying nav item placement; the retry owns the overall timeout. */
const NAV_ITEM_ATTEMPT_TIMEOUT_MS = 5_000;

/** Chrome nav for Observability — locators and actions only; `expect` here only bounds waits. */
export class ObservabilityNavigation {
  public readonly sidenav: Locator;
  public readonly primaryNav: Locator;
  /**
   * `primaryNav`, but only while its overflow split is measured (`data-overflow-measured`). Chrome
   * publishes a new nav item set with every item in the primary menu and only then measures which
   * ones fit, so reading placement from `primaryNav` alone can catch an item moments before it
   * moves into the "More" overflow.
   */
  public readonly measuredPrimaryNav: Locator;
  public readonly footerNav: Locator;
  public readonly morePopover: Locator;
  public readonly moreMenuTrigger: Locator;

  constructor(private readonly page: ScoutPage) {
    this.sidenav = this.page.testSubj.locator('kbnChromeLayoutNavigation');
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.measuredPrimaryNav = this.primaryNav.and(
      this.page.locator('[data-overflow-measured="true"]')
    );
    this.footerNav = this.page.testSubj.locator('kbnChromeNav-footer');
    this.morePopover = this.page.testSubj.locator('side-nav-popover-More');
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
  async waitForLoad(options?: { timeout?: number }) {
    await this.primaryNav.waitFor({
      state: 'visible',
      timeout: options?.timeout ?? OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS,
    });
  }

  /**
   * App root or one of the shared no-data shells. Discover/Dashboards delegate to
   * `KibanaNoDataPage`, which renders either `kbnNoDataPage` (cluster has no data) or
   * `noDataViewsPrompt` (cluster has data but no user data view), depending on cluster
   * state. The shells are mutually exclusive, so an `.or()` chain is enough — see gh-267186.
   */
  pageOrNoData(testSubj: string): Locator {
    return this.page.testSubj
      .locator(testSubj)
      .or(this.page.testSubj.locator('kbnNoDataPage'))
      .or(this.page.testSubj.locator('noDataViewsPrompt'));
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

  /** Child of a side panel or a nested More panel — overflow opens the latter. */
  navItemInPanelByDeepLinkId(panelId: string, deepLinkId: string): Locator {
    return this.anyPanel(panelId).locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInPanelById(panelId: string, id: string): Locator {
    return this.anyPanel(panelId).locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  /**
   * Resolve a body nav item wherever it renders. It lives in the primary nav on some
   * deployments but overflows into the "More" menu on others (e.g. cloud-serverless);
   * open "More" when it is not in the primary nav so the returned locator is reachable.
   *
   * The locator matches the item in either container. Chrome re-splits the menu on
   * remeasure, so a locator scoped to the container the item was in can miss by the
   * time the caller acts. To click an item, use `clickBodyNavItem*` / `openPanelById`,
   * which re-resolve placement on every attempt.
   *
   * Do not `or()` the item with the More trigger and `waitFor` — both can
   * be visible at once, which Playwright treats as a strict-mode violation.
   */
  async revealBodyNavItemByDeepLinkId(deepLinkId: string): Promise<Locator> {
    return this.revealBodyNavItem(this.navItemInBodyByDeepLinkId(deepLinkId));
  }

  /** Same overflow handling as `revealBodyNavItemByDeepLinkId`, keyed by node `id`. */
  async revealBodyNavItemById(id: string): Promise<Locator> {
    return this.revealBodyNavItem(this.navItemInBodyById(id));
  }

  private async revealBodyNavItem(bodyItem: Locator): Promise<Locator> {
    await this.waitForMeasuredNav();
    await this.waitForFirstVisible([bodyItem, this.moreMenuTrigger]);

    if (!(await bodyItem.isVisible())) {
      await this.openMoreMenu();
      await bodyItem.waitFor({
        state: 'visible',
        timeout: OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS,
      });
    }

    return bodyItem;
  }

  /**
   * Nav has painted and its overflow split is measured. Chrome can paint the More trigger
   * before this item lands in the primary nav, or paint the primary nav late after
   * `waitForLoad()` only saw the nav container.
   */
  private async waitForMeasuredNav(): Promise<void> {
    await this.waitForLoad();
    await this.measuredPrimaryNav.waitFor({
      state: 'visible',
      timeout: OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS,
    });
  }

  /** First of `locators` to become visible; prefers no one-shot `isVisible()` race. */
  private async waitForFirstVisible(locators: Locator[]): Promise<Locator> {
    if (locators.length === 0) {
      throw new Error('waitForFirstVisible requires at least one locator');
    }

    const timeout = OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS;

    return new Promise<Locator>((resolve, reject) => {
      let pending = locators.length;
      let settled = false;

      for (const locator of locators) {
        locator.waitFor({ state: 'visible', timeout }).then(
          () => {
            if (!settled) {
              settled = true;
              resolve(locator);
            }
          },
          (error) => {
            pending -= 1;
            if (!settled && pending === 0) {
              reject(error);
            }
          }
        );
      }
    });
  }

  /** Click a body nav item wherever it renders — primary nav or the "More" overflow menu. */
  async clickBodyNavItemByDeepLinkId(deepLinkId: string) {
    await this.clickBodyNavItem(this.navItemInBodyByDeepLinkId(deepLinkId));
  }

  async openPanelById(id: string): Promise<void> {
    await this.clickBodyNavItem(this.navItemInBodyById(id), this.anyPanel(id));
  }

  /**
   * Resolve placement and click inside one wait, and stop when `outcome` is visible.
   * An item can move between the primary nav and More between a placement read and the
   * click; each attempt looks again and re-opens More. Repeating the click is safe:
   * the side panel follows the active item, so a second click does not close it.
   */
  private async clickBodyNavItem(bodyItem: Locator, outcome?: Locator): Promise<void> {
    await this.waitForMeasuredNav();
    await this.waitForFirstVisible([bodyItem, this.moreMenuTrigger]);

    await expect(async () => {
      if (await outcome?.isVisible()) {
        return;
      }

      if (!(await bodyItem.isVisible())) {
        await this.openMoreMenu(NAV_ITEM_ATTEMPT_TIMEOUT_MS);
      }

      await bodyItem.click({ timeout: NAV_ITEM_ATTEMPT_TIMEOUT_MS });
      await outcome?.waitFor({ state: 'visible', timeout: NAV_ITEM_ATTEMPT_TIMEOUT_MS });
    }).toPass({ timeout: OBSERVABILITY_PRIMARY_NAV_LOAD_TIMEOUT_MS });
  }

  async clickPanelNavItemByDeepLinkId(panelId: string, deepLinkId: string): Promise<void> {
    await this.openPanelById(panelId);
    await this.navItemInPanelByDeepLinkId(panelId, deepLinkId).click();
  }

  /** If More is already open, Escape first so the next open is the root list. */
  async openMoreMenu(timeout?: number) {
    if (await this.morePopover.isVisible()) {
      await this.page.keyboard.press('Escape');
      await this.morePopover.waitFor({ state: 'hidden', timeout });
    }
    await this.moreMenuTrigger.click({ timeout });
    await this.morePopover.waitFor({ state: 'visible', timeout });
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Shared page object for the Observability solution sidenav. Used by both
 * `serverless_observability` and the stateful `observability` plugin. Helpers
 * are container-scoped (primary nav, footer, "More" popover, side panel,
 * nested panel) so tests fail loudly if an item unexpectedly migrates between
 * locations.
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

  /**
   * The `goto*` helpers are thin wrappers around `page.gotoApp` and deliberately
   * do NOT wait for the new chrome sidenav to hydrate. The sidenav only renders
   * in spaces using the `oblt` solution view, so consumers like landing-redirect
   * tests on `stateful.classic` need to hit `/app/observability` without any
   * chrome assumptions. Navigation specs should call `waitForLoad()` explicitly
   * in `beforeEach` before interacting with the sidenav.
   */
  async goto() {
    await this.page.gotoApp('observability');
  }

  async gotoLanding() {
    await this.page.gotoApp('observability/landing');
  }

  async gotoApp(appName: string) {
    await this.page.gotoApp(appName);
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

  // -- nav item locators ------------------------------------------------------

  navItemInPrimaryByDeepLinkId(deepLinkId: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInPrimaryById(id: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  /**
   * Look up a body nav item anywhere in the sidenav body (primary column or
   * the "More" popover). Use this for items whose placement depends on
   * overflow; prefer the primary / more scoped helpers whenever the position
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

  /** Nav item anywhere in the chrome sidenav (primary, footer, more popover, or any open panel). */
  navItemInSidenavByDeepLinkId(deepLinkId: string): Locator {
    return this.sidenav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInSidenavById(id: string): Locator {
    return this.sidenav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  // -- active-link locators ---------------------------------------------------

  /**
   * Matches a nav item that is currently the active route. Chrome sets the
   * additional `nav-item-isActive` token on the `data-test-subj` attribute of
   * the active item; both tokens are whitespace-separated so we match each
   * with `~=`.
   */
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

  // -- panel locators ---------------------------------------------------------

  /** Side panel rendered next to the primary nav (e.g. `admin_and_settings`). */
  sidePanel(id: string): Locator {
    return this.page.testSubj.locator(`~kbnChromeNav-sidePanel_${id}`);
  }

  /** Nested panel rendered inside the More popover for panel-opener items. */
  nestedPanel(id: string): Locator {
    return this.morePopover.locator(`[data-test-subj="kbnChromeNav-nestedPanel-${id}"]`);
  }

  /** Any open panel for the given id, regardless of whether it renders inline or nested. */
  anyPanel(id: string): Locator {
    return this.sidePanel(id).or(this.nestedPanel(id));
  }

  // -- breadcrumb locators ----------------------------------------------------

  /**
   * Breadcrumb locator. Pass either a `deepLinkId` (preferred, uses the stable
   * `breadcrumb-deepLinkId-<id>` test-subj token) or a visible `text` — the
   * latter falls back to a filter on the generic `breadcrumb` container.
   */
  breadcrumb(by: { deepLinkId: string } | { text: string }): Locator {
    if ('deepLinkId' in by) {
      return this.breadcrumbs.locator(`[data-test-subj~="breadcrumb-deepLinkId-${by.deepLinkId}"]`);
    }
    return this.breadcrumbs.locator('[data-test-subj~="breadcrumb"]', { hasText: by.text });
  }

  // -- actions ----------------------------------------------------------------

  /**
   * Opens the "More" overflow popover at its root level. If the popover is
   * already open (e.g. showing a nested panel after a previous panel-opener
   * click, or still animating closed with an intercepting mask), we dismiss
   * it with Escape first so the trigger click always produces a fresh root
   * view with all overflow items visible.
   */
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

  /**
   * SPA guard: stamps a timestamp on `window` and returns a callback that
   * reads it back. If the page reloaded at any point in between, the value
   * will be gone and the callback returns `false`. The spec is responsible
   * for asserting on the result — keeping the `expect` out of the PO (see
   * docs/extend/scout/ui-best-practices.md).
   */
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

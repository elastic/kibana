/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

const RENDER_COMPLETE_SELECTOR = '[data-render-complete="true"]';
const EMBEDDABLE_PANEL_SELECTOR = '[data-test-subj="embeddablePanel"]';
const EMBEDDABLE_ERROR_SELECTOR = '[data-test-subj="embeddableError"]';
const EMPTY_PLACEHOLDER_SELECTOR = '[data-test-subj="emptyPlaceholder"]';
const PANEL_TITLE_SELECTOR = '[data-test-subj="embeddablePanelTitle"]';
const LEGEND_ITEM_LABEL_SELECTOR = '.echLegendItem__label';

export class EmbeddablePanels {
  constructor(private readonly page: ScoutPage, private readonly root?: Locator) {}

  private get scope(): Locator {
    return this.root ?? this.page.locator(':root');
  }

  getEmbeddablePanels(): Locator {
    return this.scope.locator(EMBEDDABLE_PANEL_SELECTOR);
  }

  getRenderCompletePanels(): Locator {
    return this.getEmbeddablePanels().locator(RENDER_COMPLETE_SELECTOR);
  }

  getPanelsWithErrors(): Locator {
    return this.getEmbeddablePanels().locator(EMBEDDABLE_ERROR_SELECTOR);
  }

  getPanelsWithNoResults(): Locator {
    return this.getEmbeddablePanels().locator(EMPTY_PLACEHOLDER_SELECTOR);
  }

  getPanelByTitle(title: string): Locator {
    // Mirrors how Kibana builds `embeddablePanelHeading-<slug>` in
    // `presentation_panel_header.tsx`: the panel title with all whitespace
    // removed. If that slug rule changes upstream we will silently miss
    // panels here. The `has:` filter is auto-scoped to each parent
    // `[data-test-subj="embeddablePanel"]` matched by `getEmbeddablePanels()`,
    // so building the inner locator from `this.page` (rather than
    // `this.scope`) is intentional and standard Playwright.
    const slug = title.replace(/\s/g, '');
    return this.getEmbeddablePanels().filter({
      has: this.page.locator(`[data-test-subj="embeddablePanelHeading-${slug}"]`),
    });
  }

  async getPanelTitles(): Promise<string[]> {
    // `embeddablePanelTitle` wraps just the visible title text (no
    // visually-hidden "Panel: " prefix), so reading its inner text gives us
    // a clean, deterministic per-panel title.
    const titles = await this.getEmbeddablePanels().locator(PANEL_TITLE_SELECTOR).allInnerTexts();
    return titles.map((title) => title.trim()).filter((title) => title.length > 0);
  }

  async getLegendLabels(panelTitle: string): Promise<string[]> {
    const labels = await this.getPanelByTitle(panelTitle)
      .locator(LEGEND_ITEM_LABEL_SELECTOR)
      .allInnerTexts();
    return labels.map((label) => label.trim()).filter((label) => label.length > 0);
  }

  async waitForAllPanelsToRender(timeout = 30_000): Promise<void> {
    await expect
      .poll(
        async () => {
          const total = await this.getEmbeddablePanels().count();
          const done = await this.getRenderCompletePanels().count();
          return total > 0 && done === total;
        },
        { timeout, intervals: [200] }
      )
      .toBe(true);
  }
}

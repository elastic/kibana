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

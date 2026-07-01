/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Saved object ids for the visualizations imported by the
 * `lens/lens_basic.json` fixture archive. Use with
 * `lens.openEditor(id, visTestSubj)` to navigate directly to a saved
 * visualization without going through the listing page.
 */
export const LENS_BASIC_FIXTURE_IDS = {
  /**
   * Legacy Lens metric (`lnsLegacyMetric`), title: `Artistpreviouslyknownaslens`.
   * Renders as `legacyMtrVis` (NOT the new `mtrVis`).
   */
  artistMetric: '76fc4200-cf44-11e9-b933-fd84270f3ac1',
  /** lnsXY, title: `lnsXYvis` */
  xyVis: '76fc4200-cf44-11e9-b933-fd84270f3ac2',
  /** lnsPie, title: `lnsPieVis` */
  pieVis: '9536bed0-d57e-11ea-b169-e3a222a76b9c',
} as const;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Lens FTR group5 suites (geo/tagcloud/gauge/heatmap, formula, drag_and_drop)
 * were migrated to Scout — see #276949. This shell remains so existing FTR
 * config paths keep resolving until the empty group is removed from CI.
 */
export default (_context: FtrProviderContext) => {
  describe('lens app - group 5', () => {
    it('has no remaining FTR suites (migrated to Scout)', () => {});
  });
};

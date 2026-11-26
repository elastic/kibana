/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const AREA_PANEL_INDEX = 0;
const HISTOGRAM_PANEL_INDEX = 2;

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { header, lens, dashboard } = getPageObjects(['header', 'lens', 'dashboard']);

  const testSubjects = getService('testSubjects');
  const panelActions = getService('dashboardPanelActions');
  const filterBar = getService('filterBar');

  describe('Convert to Lens action on dashboard', function describeIndexTests() {
    before(async () => {
      await dashboard.initTests();
      await header.waitUntilLoadingHasFinished();
      await dashboard.loadDashboardInEditMode('legacy visualizations');
    });

    it('should convert legacy visualization to lens by clicking "convert to lens" action', async () => {
      const panel = (await dashboard.getDashboardPanels())[AREA_PANEL_INDEX];
      await panelActions.convertToLens(panel);
      await lens.waitForVisualization('xyVisChart');
      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumbdcrumb).to.be('Converting "area" visualization');
      const filterCount = await filterBar.getFilterCount();
      expect(filterCount).to.equal(0);
      await lens.replaceInDashboard();

      await dashboard.waitForRenderComplete();

      const titles = await dashboard.getPanelTitles();

      expect(titles[0]).to.be('area (converted)');
    });

    it('should carry the visualizations filters to Lens', async () => {
      const panel = (await dashboard.getDashboardPanels())[HISTOGRAM_PANEL_INDEX];
      await panelActions.convertToLens(panel);
      await lens.waitForVisualization('xyVisChart');

      const filterCount = await filterBar.getFilterCount();
      expect(filterCount).to.equal(1);
      await lens.replaceInDashboard();
      await dashboard.waitForRenderComplete();
    });
  });
}

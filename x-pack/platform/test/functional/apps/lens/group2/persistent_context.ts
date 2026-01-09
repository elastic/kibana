/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header, timePicker, navigationalSearch } = getPageObjects([
    'visualize',
    'lens',
    'header',
    'timePicker',
    'navigationalSearch',
  ]);
  const browser = getService('browser');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const appsMenu = getService('appsMenu');
  const security = getService('security');
  const listingTable = getService('listingTable');
  const queryBar = getService('queryBar');
  const dataViews = getService('dataViews');

  describe('lens query context', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_discover_read', 'global_visualize_read', 'test_logstash_reader'],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('Navigation search', () => {
      describe('when opening from empty visualization to existing one', () => {
        before(async () => {
          await visualize.navigateToNewVisualization();
          await visualize.clickVisType('lens');
          await navigationalSearch.focus();
          await navigationalSearch.searchFor('type:lens lnsTableVis');
          await navigationalSearch.clickOnOption(0);
          await lens.waitForDatatableVisualization();
        });
        it('filters, time and query reflect the visualization state', async () => {
          expect(await lens.getDatatableHeaderText(1, false)).to.equal('404 › Median of bytes');
          expect(await lens.getDatatableHeaderText(2, false)).to.equal('503 › Median of bytes');
          expect(await lens.getDatatableCellText(0, 0, false)).to.eql('TG');
          expect(await lens.getDatatableCellText(0, 1, false)).to.eql('9,931');
        });
        it('preserves time range', async () => {
          const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
          expect(timePickerValues.start).to.eql(timePicker.defaultStartTime);
          expect(timePickerValues.end).to.eql(timePicker.defaultEndTime);
          // data is correct and top nav is correct
        });
        it('loads filters', async () => {
          const filterCount = await filterBar.getFilterCount();
          expect(filterCount).to.equal(1);
        });
        it('loads query', async () => {
          const query = await queryBar.getQueryString();
          expect(query).to.equal('extension.raw : "jpg" or extension.raw : "gif" ');
        });
      });
      describe('when opening from existing visualization to empty one', () => {
        before(async () => {
          await visualize.gotoVisualizationLandingPage();
          await listingTable.searchForItemWithName('lnsTableVis');
          await lens.clickVisualizeListItemTitle('lnsTableVis');
          await retry.try(async () => {
            await navigationalSearch.focus();
            await navigationalSearch.searchFor('type:application lens');
            await navigationalSearch.clickOnOption(0);
          });
          await lens.waitForEmptyWorkspace();
          await lens.switchToVisualization('lnsLegacyMetric');
          await lens.dragFieldToWorkspace('@timestamp', 'legacyMtrVis');
        });
        it('preserves time range', async () => {
          // fill the navigation search and select empty
          // see the time
          const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
          expect(timePickerValues.start).to.eql(timePicker.defaultStartTime);
          expect(timePickerValues.end).to.eql(timePicker.defaultEndTime);
        });
        it('cleans filters', async () => {
          const filterCount = await filterBar.getFilterCount();
          expect(filterCount).to.equal(0);
        });
        it('cleans query', async () => {
          const query = await queryBar.getQueryString();
          expect(query).to.equal('');
        });
        it('filters, time and query reflect the visualization state', async () => {
          await lens.assertLegacyMetric('Unique count of @timestamp', '14,181');
        });
      });
    });

    describe('Switching in Visualize App', () => {
      it('when moving from existing to empty workspace, preserves time range, cleans filters and query', async () => {
        // go to existing vis
        await visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsTableVis');
        await lens.clickVisualizeListItemTitle('lnsTableVis');
        // go to empty vis
        await lens.goToListingPageViaBreadcrumbs();
        await visualize.clickNewVisualization();
        await visualize.waitForGroupsSelectPage();
        await visualize.clickVisType('lens');
        await lens.waitForEmptyWorkspace();
        await lens.switchToVisualization('lnsLegacyMetric');
        await lens.dragFieldToWorkspace('@timestamp', 'legacyMtrVis');

        const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.eql(timePicker.defaultStartTime);
        expect(timePickerValues.end).to.eql(timePicker.defaultEndTime);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(0);
        const query = await queryBar.getQueryString();
        expect(query).to.equal('');
        await lens.assertLegacyMetric('Unique count of @timestamp', '14,181');
      });
      it('when moving from empty to existing workspace, preserves time range and loads filters and query', async () => {
        // go to existing vis
        await lens.goToListingPageViaBreadcrumbs();
        await listingTable.searchForItemWithName('lnsTableVis');
        await lens.clickVisualizeListItemTitle('lnsTableVis');

        expect(await lens.getDatatableHeaderText(1, false)).to.equal('404 › Median of bytes');
        expect(await lens.getDatatableHeaderText(2, false)).to.equal('503 › Median of bytes');
        expect(await lens.getDatatableCellText(0, 0, false)).to.eql('TG');
        expect(await lens.getDatatableCellText(0, 1, false)).to.eql('9,931');

        const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.eql(timePicker.defaultStartTime);
        expect(timePickerValues.end).to.eql(timePicker.defaultEndTime);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
        const query = await queryBar.getQueryString();
        expect(query).to.equal('extension.raw : "jpg" or extension.raw : "gif" ');
      });
    });

    it('should carry over time range and pinned filters to discover', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange('Sep 6, 2015 @ 06:31:44.000', 'Sep 18, 2025 @ 06:31:44.000');
      await filterBar.addFilter({ field: 'ip', operation: 'is', value: '97.220.3.248' });
      await filterBar.toggleFilterPinned('ip');
      await header.clickDiscover();
      const timeRange = await timePicker.getTimeConfig();
      expect(timeRange.start).to.equal('Sep 6, 2015 @ 06:31:44.000');
      expect(timeRange.end).to.equal('Sep 18, 2025 @ 06:31:44.000');
      await filterBar.hasFilter('ip', '97.220.3.248', true, true);
    });

    it('should remember time range and pinned filters from discover', async () => {
      await lens.goToTimeRange('Sep 7, 2015 @ 06:31:44.000', 'Sep 19, 2025 @ 06:31:44.000');
      await filterBar.toggleFilterEnabled('ip');
      await appsMenu.clickLink('Visualize library', { category: 'kibana' });
      await visualize.clickNewVisualization();
      await visualize.waitForGroupsSelectPage();
      await visualize.clickVisType('lens');
      const timeRange = await timePicker.getTimeConfig();
      expect(timeRange.start).to.equal('Sep 7, 2015 @ 06:31:44.000');
      expect(timeRange.end).to.equal('Sep 19, 2025 @ 06:31:44.000');
      await filterBar.hasFilter('ip', '97.220.3.248', false, true);
    });

    it('keep time range and pinned filters after refresh', async () => {
      await browser.refresh();
      // Lens app can take a while to be fully functional after refresh, retry assertion
      await retry.try(async () => {
        const timeRange = await timePicker.getTimeConfig();
        expect(timeRange.start).to.equal('Sep 7, 2015 @ 06:31:44.000');
        expect(timeRange.end).to.equal('Sep 19, 2025 @ 06:31:44.000');
        await filterBar.hasFilter('ip', '97.220.3.248', false, true);
      });
    });

    it('keeps selected index pattern after refresh', async () => {
      await lens.switchDataPanelIndexPattern('log*');
      await browser.refresh();
      // Lens app can take a while to be fully functional after refresh, retry assertion
      await dataViews.waitForSwitcherToBe('log*');
    });

    it('keeps time range and pinned filters after refreshing directly after saving', async () => {
      // restore defaults so visualization becomes saveable
      await security.testUser.restoreDefaults();
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.save('persistentcontext');
      await browser.refresh();
      // Lens app can take a while to be fully functional after refresh, retry assertion
      await retry.try(async () => {
        const timeRange = await timePicker.getTimeConfig();
        expect(timeRange.start).to.equal('Sep 7, 2015 @ 06:31:44.000');
        expect(timeRange.end).to.equal('Sep 19, 2025 @ 06:31:44.000');
        await filterBar.hasFilter('ip', '97.220.3.248', false, true);
      });
    });
  });
}

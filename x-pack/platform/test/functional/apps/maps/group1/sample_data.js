/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

export default function ({ getPageObjects, getService, updateBaselines }) {
  const { common, maps, header, home, timePicker } = getPageObjects([
    'common',
    'maps',
    'header',
    'home',
    'timePicker',
  ]);
  const screenshot = getService('screenshots');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  // Only update the baseline images from CI session images after comparing them
  // These tests might fail locally because of scaling factors and resolution.

  describe('maps loaded from sample data', () => {
    before(async () => {
      //installing the sample data with test user with super user role and then switching roles with limited privileges
      await security.testUser.setRoles(['superuser'], { skipBrowserRefresh: true });
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.addSampleDataSet('ecommerce');
      await home.addSampleDataSet('flights');
      await home.addSampleDataSet('logs');

      // Sample data is shifted to be relative to current time
      // This means that a static timerange will return different documents
      // Setting the time range to a window larger than the sample data set
      // ensures all documents are coverered by time query so the ES results will always be the same
      const SAMPLE_DATA_RANGE = `[
        {
          "from": "now-180d",
          "to": "now+180d",
          "display": "sample data range"
        }
      ]`;

      await kibanaServer.uiSettings.update({
        [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE,
      });
      //running the rest of the tests with limited roles
      await security.testUser.setRoles(
        ['global_maps_all', 'geoall_data_writer', 'kibana_sample_read'],
        {
          skipBrowserRefresh: true,
        }
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.removeSampleDataSet('ecommerce');
      await home.removeSampleDataSet('flights');
      await home.removeSampleDataSet('logs');
    });

    describe('ecommerce', () => {
      before(async () => {
        await maps.loadSavedMap('[eCommerce] Orders by Country');
        await maps.toggleEmsBasemapLayerVisibility();
        await maps.toggleLayerVisibility('United Kingdom');
        await maps.toggleLayerVisibility('France');
        await maps.toggleLayerVisibility('United States');
        await maps.toggleLayerVisibility('World Countries');
        await timePicker.setCommonlyUsedTime('sample_data range');
        await maps.enterFullScreen();
        await maps.closeLegend();
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
      });

      after(async () => {
        await maps.existFullScreen();
      });

      it('should load layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'ecommerce_map',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.02);
      });
    });

    describe('flights', () => {
      before(async () => {
        await maps.loadSavedMap('[Flights] Origin Time Delayed');
        await maps.toggleEmsBasemapLayerVisibility();
        await timePicker.setCommonlyUsedTime('sample_data range');
        await maps.enterFullScreen();
        await maps.closeLegend();
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
      });

      after(async () => {
        await maps.existFullScreen();
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'flights_map',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.022);
      });
    });

    describe('web logs', () => {
      before(async () => {
        await maps.loadSavedMap('[Logs] Total Requests and Bytes');
        await maps.toggleLayerVisibility('Total Requests by Destination');
        await maps.toggleEmsBasemapLayerVisibility();
        await timePicker.setCommonlyUsedTime('sample_data range');
        await maps.enterFullScreen();
        await maps.closeLegend();
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
      });

      after(async () => {
        await maps.existFullScreen();
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'web_logs_map',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.031);
      });
    });
  });
}

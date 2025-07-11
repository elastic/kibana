/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({
  getPageObjects,
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const { common, maps, header, home, timePicker } = getPageObjects([
    'common',
    'maps',
    'header',
    'home',
    'timePicker',
  ]);
  const mapsHelper = getService('mapsHelper');
  const screenshot = getService('screenshots');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const SAMPLE_DATA_RANGE = `[
    {
      "from": "now-30d",
      "to": "now+40d",
      "display": "sample data range"
    },
    {
      "from": "now/d",
      "to": "now/d",
      "display": "Today"
    },
    {
      "from": "now/w",
      "to": "now/w",
      "display": "This week"
    },
    {
      "from": "now-15m",
      "to": "now",
      "display": "Last 15 minutes"
    },
    {
      "from": "now-30m",
      "to": "now",
      "display": "Last 30 minutes"
    },
    {
      "from": "now-1h",
      "to": "now",
      "display": "Last 1 hour"
    },
    {
      "from": "now-24h",
      "to": "now",
      "display": "Last 24 hours"
    },
    {
      "from": "now-7d",
      "to": "now",
      "display": "Last 7 days"
    },
    {
      "from": "now-30d",
      "to": "now",
      "display": "Last 30 days"
    },
    {
      "from": "now-90d",
      "to": "now",
      "display": "Last 90 days"
    },
    {
      "from": "now-1y",
      "to": "now",
      "display": "Last 1 year"
    }
  ]`;

  // Only update the baseline images from Jenkins session images after comparing them
  // These tests might fail locally because of scaling factors and resolution.

  describe('upgrade maps smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    before(async () => {
      await kibanaServer.uiSettings.update(
        { [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE },
        { space: 'default' }
      );
      await kibanaServer.uiSettings.update(
        { [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE },
        { space: 'automation' }
      );
      await browser.refresh();
    });

    spaces.forEach(({ space, basePath }) => {
      describe('space: ' + space + ', name: ecommerce', () => {
        before(async () => {
          await common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await header.waitUntilLoadingHasFinished();
          await home.launchSampleMap('ecommerce');
          await header.waitUntilLoadingHasFinished();
          await maps.waitForLayersToLoad();
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
        it('should load layers', async () => {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'upgrade_ecommerce_map',
            updateBaselines
          );
          expect(percentDifference.toFixed(3)).to.be.lessThan(0.05);
        });
      });
      describe('space: ' + space + ', name: flights', () => {
        before(async () => {
          await common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await header.waitUntilLoadingHasFinished();
          await home.launchSampleMap('flights');
          await header.waitUntilLoadingHasFinished();
          await maps.waitForLayersToLoad();
          await maps.toggleEmsBasemapLayerVisibility();
          await timePicker.setCommonlyUsedTime('sample_data range');
          await maps.enterFullScreen();
          await maps.closeLegend();
          const mapContainerElement = await testSubjects.find('mapContainer');
          await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
        });
        it('should load saved object and display layers', async () => {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'upgrade_flights_map',
            updateBaselines
          );
          expect(percentDifference.toFixed(3)).to.be.lessThan(0.05);
        });
      });
      describe('space: ' + space + ', name: web logs', () => {
        before(async () => {
          await common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await header.waitUntilLoadingHasFinished();
          await home.launchSampleMap('logs');
          await header.waitUntilLoadingHasFinished();
          await maps.waitForLayersToLoad();
          await maps.toggleEmsBasemapLayerVisibility();
          await mapsHelper.toggleLayerVisibilityTotalRequests();
          await timePicker.setCommonlyUsedTime('sample_data range');
          await maps.enterFullScreen();
          await maps.closeLegend();
          const mapContainerElement = await testSubjects.find('mapContainer');
          await mapContainerElement.moveMouseTo({ xOffset: 0, yOffset: 0 });
        });
        it('should load saved object and display layers', async () => {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'upgrade_web_logs_map',
            updateBaselines
          );
          expect(percentDifference.toFixed(3)).to.be.lessThan(0.05);
        });
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import rison from '@kbn/rison';
import moment from 'moment';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningForecastProvider({ getPageObject, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const headerPage = getPageObject('header');
  const browser = getService('browser');

  return {
    async assertForecastButtonExists() {
      await testSubjects.existOrFail(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
    },

    async assertForecastButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "forecast" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertForecastChartElementsExists() {
      await retry.tryForTime(3000, async () => {
        await testSubjects.existOrFail(`mlForecastArea`, {
          timeout: 30 * 1000,
        });
      });

      await retry.tryForTime(3000, async () => {
        await testSubjects.existOrFail(`mlForecastValuesline`, {
          timeout: 30 * 1000,
        });
      });

      await retry.tryForTime(3000, async () => {
        await testSubjects.existOrFail(`mlForecastMarkers`, {
          timeout: 30 * 1000,
        });
      });
    },

    async assertForecastChartElementsHidden() {
      await testSubjects.missingOrFail(`mlForecastArea`, {
        allowHidden: true,
        timeout: 30 * 1000,
      });
      await testSubjects.missingOrFail(`mlForecastValuesline`, {
        allowHidden: true,
        timeout: 30 * 1000,
      });
      await testSubjects.missingOrFail(`mlForecastMarkers`, {
        allowHidden: true,
        timeout: 30 * 1000,
      });
    },

    async assertForecastCheckboxExists() {
      await testSubjects.existOrFail(`mlForecastCheckbox`, {
        timeout: 30 * 1000,
      });
    },

    async assertForecastCheckboxMissing() {
      await testSubjects.missingOrFail(`mlForecastCheckbox`, {
        timeout: 30 * 1000,
      });
    },

    async clickForecastCheckbox() {
      await testSubjects.click('mlForecastCheckbox');
    },

    async openForecastModal() {
      await testSubjects.click(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
      await testSubjects.existOrFail('mlModalForecast');
    },

    async closeForecastModal() {
      await testSubjects.click('mlModalForecast > mlModalForecastButtonClose');
      await this.assertForecastModalMissing();
    },

    async assertForecastModalMissing() {
      await testSubjects.missingOrFail(`mlModalForecast`, {
        timeout: 30 * 1000,
      });
    },

    async assertForecastNeverExpireSwitchExists() {
      await testSubjects.existOrFail('mlModalForecastNeverExpireSwitch');
      expect(await testSubjects.isChecked('mlModalForecastNeverExpireSwitch')).to.be(false);
    },

    async assertForecastModalRunButtonEnabled(expectedValue: boolean) {
      await headerPage.waitUntilLoadingHasFinished();
      const isEnabled = await testSubjects.isEnabled('mlModalForecast > mlModalForecastButtonRun');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected forecast "run" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertForecastTableExists() {
      await testSubjects.existOrFail('mlModalForecast > mlModalForecastTable');
    },

    async clickForecastModalRunButton() {
      await testSubjects.click('mlModalForecast > mlModalForecastButtonRun');
      await this.assertForecastModalMissing();
    },

    async getForecastTableRows() {
      return await testSubjects.findAll('mlModalForecastTable > ~mlForecastsListRow');
    },

    async assertForecastTableNotEmpty() {
      const tableRows = await this.getForecastTableRows();
      expect(tableRows.length).to.be.greaterThan(
        0,
        `Forecast table should have at least one row (got '${tableRows.length}')`
      );
    },

    //
    async moveZoomSlider(shiftAmount: string = '1d') {
      // console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      await retry.tryForTime(3000, async () => {
        const currentUrl = await browser.getCurrentUrl();
        const url = new URL(currentUrl);
        const searchParams = new URLSearchParams(url.searchParams);
        const _g = rison.decode(searchParams.get('_g')!) as { time: { from: string; to: string } };
        const _a = rison.decode(searchParams.get('_a')!) as {
          timeseriesexplorer: { mlTimeSeriesExplorer: { zoom: { from: string; to: string } } };
        };
        const time = _g.time;
        const zoom = _a.timeseriesexplorer.mlTimeSeriesExplorer.zoom;

        // console.log('Time:', time);
        // console.log('Zoom:', zoom);

        if (time.from !== zoom.from) {
          return;
        }

        const newFrom = moment(zoom.from).add(moment.duration(shiftAmount)).toISOString();
        const newTo = moment(zoom.to).add(moment.duration(shiftAmount)).toISOString();

        // eslint-disable-next-line no-console
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

        // eslint-disable-next-line no-console
        console.log(
          `Moving zoom slider from ${zoom.from} to ${newFrom} and ${zoom.to} to ${newTo}`
        );

        // Update the URL with the new zoom range
        _a.timeseriesexplorer.mlTimeSeriesExplorer.zoom = { from: newFrom, to: newTo };

        // Construct the new URL
        searchParams.set('_a', rison.encode(_a));
        const newUrl = `${url.origin}${url.pathname}?${searchParams.toString()}`;

        // Navigate to the new URL
        await browser.get(newUrl);

        // expect(_a).to.not.be(null, 'URL parameter _a should exist');
        return _a;
      });
    },
  };
}

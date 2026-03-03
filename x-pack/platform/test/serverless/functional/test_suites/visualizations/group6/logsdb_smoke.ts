/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, lens, timePicker, svlCommonPage } = getPageObjects([
    'common',
    'lens',
    'timePicker',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const indexPatterns = getService('indexPatterns');
  const esArchiver = getService('esArchiver');

  describe('lens logsdb - smoke and scenarios 1-2', function () {
    // see details: https://github.com/elastic/kibana/issues/195089
    this.tags(['failsOnMKI']);
    const logsdbIndex = 'kibana_sample_data_logslogsdb';
    const logsdbDataView = logsdbIndex;
    const logsdbEsArchive =
      'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_logsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
      await svlCommonPage.loginAsAdmin();
      log.info(`loading ${logsdbIndex} index...`);
      await esArchiver.loadIfNeeded(logsdbEsArchive);
      log.info(`creating a data view for "${logsdbDataView}"...`);
      await indexPatterns.create(
        {
          title: logsdbDataView,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      log.info(`updating settings to use the "${logsdbDataView}" dataView...`);
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        defaultIndex: '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51',
        'timepicker:timeDefaults': `{ "from": "${fromTime}", "to": "${toTime}" }`,
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await es.indices.delete({ index: [logsdbIndex] });
    });

    describe('smoke testing functions support', () => {
      before(async () => {
        await common.navigateToApp('lens');
        await lens.switchDataPanelIndexPattern(logsdbDataView);
        await lens.goToTimeRange();
      });

      afterEach(async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
      });

      const allOperations = [
        'average',
        'max',
        'last_value',
        'median',
        'percentile',
        'percentile_rank',
        'standard_deviation',
        'sum',
        'unique_count',
        'min',
        'max',
        'counter_rate',
        'last_value',
      ];

      it(`should work with all operations`, async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });

        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'count',
          field: 'bytes',
          keepOpen: true,
        });

        for (const operation of allOperations) {
          expect(
            testSubjects.exists(`lns-indexPatternDimension-${operation} incompatible`, {
              timeout: 500,
            })
          ).to.eql(false);
          await lens.selectOperation(operation);

          expect(
            await find.existsByCssSelector(
              '[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText',
              500
            )
          ).to.be(false);
        }
        await lens.closeDimensionEditor();
      });
    });
  });
}

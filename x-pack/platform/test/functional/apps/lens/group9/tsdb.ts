/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import {
  type ScenarioIndexes,
  TEST_DOC_COUNT,
  getDataMapping,
  getDocsGenerator,
  setupScenarioRunner,
  sumFirstNValues,
} from '../tsdb_logsdb_helpers';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { lens } = getPageObjects(['lens']);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const dataStreams = getService('dataStreams');
  const indexPatterns = getService('indexPatterns');
  const esArchiver = getService('esArchiver');

  const createDocs = getDocsGenerator(log, es, 'tsdb');

  describe('lens tsdb', function () {
    const tsdbIndex = 'kibana_sample_data_logstsdb';
    const tsdbDataView = tsdbIndex;
    const tsdbEsArchive =
      'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
      log.info(`loading ${tsdbIndex} index...`);
      await esArchiver.loadIfNeeded(tsdbEsArchive);
      log.info(`creating a data view for "${tsdbDataView}"...`);
      await indexPatterns.create(
        {
          title: tsdbDataView,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      log.info(`updating settings to use the "${tsdbDataView}" dataView...`);
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        defaultIndex: '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51',
        'timepicker:timeDefaults': `{ "from": "${fromTime}", "to": "${toTime}" }`,
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await es.indices.delete({ index: [tsdbIndex] });
    });

    describe('Scenarios with changing stream type', () => {
      const getScenarios = (
        initialIndex: string
      ): Array<{
        name: string;
        indexes: ScenarioIndexes[];
      }> => [
        {
          name: 'Dataview with no additional stream/index',
          indexes: [{ index: initialIndex }],
        },
        {
          name: 'Dataview with an additional regular index',
          indexes: [
            { index: initialIndex },
            { index: 'regular_index', create: true, removeTSDBFields: true },
          ],
        },
        {
          name: 'Dataview with an additional downsampled TSDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'tsdb_index_2', create: true, mode: 'tsdb', downsample: true },
          ],
        },
        {
          name: 'Dataview with additional regular index and a downsampled TSDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'regular_index', create: true, removeTSDBFields: true },
            { index: 'tsdb_index_2', create: true, mode: 'tsdb', downsample: true },
          ],
        },
        {
          name: 'Dataview with an additional TSDB stream',
          indexes: [{ index: initialIndex }, { index: 'tsdb_index_2', create: true, mode: 'tsdb' }],
        },
      ];

      const { runTestsForEachScenario, toTimeForScenarios, fromTimeForScenarios } =
        setupScenarioRunner(getService, getPageObjects, getScenarios);

      describe('Data-stream upgraded to TSDB scenarios', () => {
        const streamIndex = 'data_stream';
        // rollover does not allow to change name, it will just change backing index underneath
        const streamConvertedToTsdbIndex = streamIndex;

        before(async () => {
          log.info(`Creating "${streamIndex}" data stream...`);
          await dataStreams.createDataStream(
            streamIndex,
            getDataMapping({ mode: 'tsdb' }),
            undefined
          );

          // add some data to the stream
          await createDocs(streamIndex, { isStream: true }, fromTimeForScenarios);

          log.info(`Update settings for "${streamIndex}" dataView...`);
          await kibanaServer.uiSettings.update({
            'dateFormat:tz': 'UTC',
            'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
          });
          log.info(`Upgrade "${streamIndex}" stream to TSDB...`);

          const tsdbMapping = getDataMapping({ mode: 'tsdb' });
          await dataStreams.upgradeStream(streamIndex, tsdbMapping, 'tsdb');
          log.info(
            `Add more data to new "${streamConvertedToTsdbIndex}" dataView (now with TSDB backing index)...`
          );
          // add some more data when upgraded
          await createDocs(streamConvertedToTsdbIndex, { isStream: true }, toTimeForScenarios);
        });

        after(async () => {
          await dataStreams.deleteDataStream(streamIndex);
        });

        runTestsForEachScenario(streamConvertedToTsdbIndex, 'tsdb', (indexes) => {
          it('should detect the data stream has now been upgraded to TSDB', async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
              keepOpen: true,
            });

            expect(
              testSubjects.exists(`lns-indexPatternDimension-average incompatible`, {
                timeout: 500,
              })
            ).to.eql(false);
            await lens.closeDimensionEditor();
          });

          it(`should visualize a date histogram chart for counter field`, async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
              keepOpen: true,
            });
            // Bar charts default "Include empty rows" off; keep the empty buckets so
            // the first/last bars still cover the whole time range as asserted below.
            await testSubjects.setEuiSwitch('indexPattern-include-empty-rows', 'check');
            await lens.closeDimensionEditor();

            // check the counter field works
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
            });
            // and also that the count of documents should be "indexes.length" times overall
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'count',
            });

            await lens.waitForVisualization('xyVisChart');
            const data = await lens.getCurrentChartDebugState('xyVisChart');
            const counterBars = data?.bars![0].bars;
            const countBars = data?.bars![1].bars;

            log.info('Check counter data before the upgrade');
            // check there's some data before the upgrade
            expect(counterBars?.[0].y).to.eql(5000);
            log.info('Check counter data after the upgrade');
            // check there's some data after the upgrade
            expect(counterBars?.[counterBars.length - 1].y).to.eql(5000);

            // due to the flaky nature of exact check here, we're going to relax it
            // as long as there's data before and after it is ok
            log.info('Check count before the upgrade');
            const columnsToCheck = countBars ? countBars.length / 2 : 0;
            // Before the upgrade the count is N times the indexes
            expect(sumFirstNValues(columnsToCheck, countBars)).to.be.greaterThan(
              indexes.length * TEST_DOC_COUNT - 1
            );
            log.info('Check count after the upgrade');
            // later there are only documents for the upgraded stream
            expect(
              sumFirstNValues(columnsToCheck, [...(countBars ?? [])].reverse())
            ).to.be.greaterThan(TEST_DOC_COUNT - 1);
          });
        });
      });
    });
  });
}

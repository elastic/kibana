/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import {
  type ScenarioIndexes,
  getDataMapping,
  getDocsGenerator,
  setupScenarioRunner,
  TIME_PICKER_FORMAT,
} from '../tsdb_logsdb_helpers';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, lens, discover, header, timePicker, svlCommonPage } = getPageObjects([
    'common',
    'lens',
    'discover',
    'header',
    'timePicker',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const dataStreams = getService('dataStreams');
  const indexPatterns = getService('indexPatterns');
  const esArchiver = getService('esArchiver');
  const monacoEditor = getService('monacoEditor');
  const retry = getService('retry');

  const createDocs = getDocsGenerator(log, es, 'logsdb');

  describe('lens logsdb downgrade', function () {
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

    describe('Scenarios with changing stream type', () => {
      const getScenarios = (
        initialIndex: string
      ): Array<{
        name: string;
        indexes: ScenarioIndexes[];
      }> => [
        {
          name: 'LogsDB stream with no additional stream/index',
          indexes: [{ index: initialIndex }],
        },
        {
          name: 'LogsDB stream with no additional stream/index and no host.name field',
          indexes: [
            {
              index: `${initialIndex}_no_host`,
              removeLogsDBFields: true,
              create: true,
              mode: 'logsdb',
            },
          ],
        },
        {
          name: 'LogsDB stream with an additional regular index',
          indexes: [{ index: initialIndex }, { index: 'regular_index', create: true }],
        },
        {
          name: 'LogsDB stream with an additional LogsDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'logsdb_index_2', create: true, mode: 'logsdb' },
          ],
        },
        {
          name: 'LogsDB stream with an additional TSDB stream',
          indexes: [{ index: initialIndex }, { index: 'tsdb_index', create: true, mode: 'tsdb' }],
        },
        {
          name: 'LogsDB stream with an additional TSDB stream downsampled',
          indexes: [
            { index: initialIndex },
            { index: 'tsdb_index_downsampled', create: true, mode: 'tsdb', downsample: true },
          ],
        },
      ];

      const { runTestsForEachScenario, toTimeForScenarios, fromTimeForScenarios } =
        setupScenarioRunner(getService, getPageObjects, getScenarios);

      describe('LogsDB downgraded to regular data stream scenarios', () => {
        const logsdbStream = 'logsdb_stream_dowgradable';
        // rollover does not allow to change name, it will just change backing index underneath
        const logsdbConvertedToStream = logsdbStream;

        before(async () => {
          log.info(`Creating "${logsdbStream}" data stream...`);
          await dataStreams.createDataStream(
            logsdbStream,
            getDataMapping({ mode: 'logsdb' }),
            'logsdb'
          );

          // add some data to the stream
          await createDocs(logsdbStream, { isStream: true }, fromTimeForScenarios);

          log.info(`Update settings for "${logsdbStream}" dataView...`);
          await kibanaServer.uiSettings.update({
            'dateFormat:tz': 'UTC',
            'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
          });
          log.info(
            `Dowgrade "${logsdbStream}" stream into regular stream "${logsdbConvertedToStream}"...`
          );

          await dataStreams.downgradeStream(
            logsdbStream,
            getDataMapping({ mode: 'logsdb' }),
            'logsdb'
          );
          log.info(
            `Add more data to new "${logsdbConvertedToStream}" dataView (no longer LogsDB)...`
          );
          // add some more data when upgraded
          await createDocs(logsdbConvertedToStream, { isStream: true }, toTimeForScenarios);
        });

        after(async () => {
          await dataStreams.deleteDataStream(logsdbConvertedToStream);
        });

        runTestsForEachScenario(logsdbConvertedToStream, 'logsdb', (indexes) => {
          it(`should visualize a date histogram chart`, async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            // check that a basic agg on a field works
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes`,
            });

            await lens.waitForVisualization('xyVisChart');
            const data = await lens.getCurrentChartDebugState('xyVisChart');
            const bars = data?.bars![0].bars;

            log.info('Check counter data before the upgrade');
            // check there's some data before the upgrade
            expect(bars?.[0].y).to.be.above(0);
            log.info('Check counter data after the upgrade');
            // check there's some data after the upgrade
            expect(bars?.[bars.length - 1].y).to.be.above(0);
          });

          it(`should visualize a date histogram chart using a different date field`, async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: 'utc_time',
            });

            // check the counter field works
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes`,
            });

            await lens.waitForVisualization('xyVisChart');
            const data = await lens.getCurrentChartDebugState('xyVisChart');
            const bars = data?.bars![0].bars;

            log.info('Check counter data before the upgrade');
            // check there's some data before the upgrade
            expect(bars?.[0].y).to.be.above(0);
            log.info('Check counter data after the upgrade');
            // check there's some data after the upgrade
            expect(bars?.[bars.length - 1].y).to.be.above(0);
          });

          it('should visualize an annotation layer from a logsDB stream', async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: 'utc_time',
            });

            // check the counter field works
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes`,
            });
            await lens.createLayer('annotations');

            await lens.assertLayerCount(2);
            // switch to the annotation tab
            await lens.ensureLayerTabIsActive(1);
            expect(
              await (
                await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
              ).getVisibleText()
            ).to.eql('Event');
            await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
            await testSubjects.click('lnsXY_annotation_query');
            await lens.configureQueryAnnotation({
              queryString: 'host.name: *',
              timeField: '@timestamp',
              textDecoration: { type: 'name' },
              extraFields: ['host.name', 'utc_time'],
            });
            await lens.closeDimensionEditor();

            await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
            await lens.removeLayer(1);
          });

          it('should visualize an annotation layer from a logsDB stream using another time field', async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: 'utc_time',
            });

            // check the counter field works
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes`,
            });
            await lens.createLayer('annotations');

            await lens.assertLayerCount(2);
            // switch to the annotation tab
            await lens.ensureLayerTabIsActive(1);
            expect(
              await (
                await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
              ).getVisibleText()
            ).to.eql('Event');
            await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
            await testSubjects.click('lnsXY_annotation_query');
            await lens.configureQueryAnnotation({
              queryString: 'host.name: *',
              timeField: 'utc_time',
              textDecoration: { type: 'name' },
              extraFields: ['host.name', '@timestamp'],
            });
            await lens.closeDimensionEditor();

            await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
            await lens.removeLayer(1);
          });

          it('should visualize correctly ES|QL queries based on a LogsDB stream', async () => {
            await common.navigateToApp('discover');
            await discover.selectTextBaseLang();

            // Use the lens page object here also for discover: both use the same timePicker object
            await lens.goToTimeRange(
              fromTimeForScenarios,
              moment
                .utc(toTimeForScenarios, TIME_PICKER_FORMAT)
                .add(2, 'hour')
                .format(TIME_PICKER_FORMAT)
            );

            await header.waitUntilLoadingHasFinished();
            await monacoEditor.setCodeEditorValue(
              `from ${indexes
                .map(({ index }) => index)
                .join(', ')} | stats averageB = avg(bytes) by extension`
            );
            await testSubjects.click('querySubmitButton');
            await header.waitUntilLoadingHasFinished();
            await testSubjects.click('unifiedHistogramEditFlyoutVisualization');

            await header.waitUntilLoadingHasFinished();

            await retry.waitFor('lens flyout', async () => {
              const dimensions = await testSubjects.findAll('lns-dimensionTrigger-textBased');
              return (
                dimensions.length === 2 && (await dimensions[1].getVisibleText()) === 'averageB'
              );
            });

            // go back to Lens to not break the wrapping function
            await common.navigateToApp('lens');
          });
        });
      });
    });
  });
}

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
  getDataMapping,
  getDocsGenerator,
  setupScenarioRunner,
} from '../tsdb_logsdb_helpers';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, lens, discover, header, timePicker } = getPageObjects([
    'common',
    'lens',
    'discover',
    'header',
    'timePicker',
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

  describe('lens logsdb', function () {
    const logsdbIndex = 'kibana_sample_data_logslogsdb';
    const logsdbDataView = logsdbIndex;
    const logsdbEsArchive =
      'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_logsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
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
      before(async () => {
        await common.navigateToApp('lens');
      });

      afterEach(async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
      });

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

      describe('Data-stream upgraded to LogsDB scenarios', () => {
        const streamIndex = 'data_stream';
        // rollover does not allow to change name, it will just change backing index underneath
        const streamConvertedToLogsDBIndex = streamIndex;

        before(async () => {
          log.info(`Creating "${streamIndex}" data stream...`);
          await dataStreams.createDataStream(
            streamIndex,
            getDataMapping({ mode: 'logsdb' }),
            undefined
          );

          // add some data to the stream
          await createDocs(streamIndex, { isStream: true }, fromTimeForScenarios);

          log.info(`Update settings for "${streamIndex}" dataView...`);
          await kibanaServer.uiSettings.update({
            'dateFormat:tz': 'UTC',
            'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
          });
          log.info(`Upgrade "${streamIndex}" stream to LogsDB...`);

          const logsdbMapping = getDataMapping({ mode: 'logsdb' });
          await dataStreams.upgradeStream(streamIndex, logsdbMapping, 'logsdb');
          log.info(
            `Add more data to new "${streamConvertedToLogsDBIndex}" dataView (now with LogsDB backing index)...`
          );
          // add some more data when upgraded
          await createDocs(streamConvertedToLogsDBIndex, { isStream: true }, toTimeForScenarios);
        });

        after(async () => {
          await dataStreams.deleteDataStream(streamIndex);
        });

        runTestsForEachScenario(streamConvertedToLogsDBIndex, 'logsdb', (indexes) => {
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

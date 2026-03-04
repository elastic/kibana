/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, lens, dashboard, svlCommonPage } = getPageObjects([
    'common',
    'lens',
    'dashboard',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const dataStreams = getService('dataStreams');
  const indexPatterns = getService('indexPatterns');
  const esArchiver = getService('esArchiver');

  describe('lens tsdb', function () {
    const tsdbIndex = 'kibana_sample_data_logstsdb';
    const tsdbDataView = tsdbIndex;
    const tsdbEsArchive =
      'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
      await svlCommonPage.loginAsAdmin();
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

    // FLAKY: https://github.com/elastic/kibana/issues/232416
    // FLAKY: https://github.com/elastic/kibana/issues/232417
    describe('downsampling', () => {
      const downsampleDataView: { index: string; dataView: string } = { index: '', dataView: '' };
      before(async () => {
        const downsampledTargetIndex = await dataStreams.downsampleTSDBIndex(tsdbIndex, {
          isStream: false,
        });
        downsampleDataView.index = downsampledTargetIndex;
        downsampleDataView.dataView = `${tsdbIndex},${downsampledTargetIndex}`;

        log.info(`creating a data view for "${downsampleDataView.dataView}"...`);
        await indexPatterns.create(
          {
            title: downsampleDataView.dataView,
            timeFieldName: '@timestamp',
          },
          { override: true }
        );
      });

      after(async () => {
        await es.indices.delete({ index: [downsampleDataView.index] });
      });

      describe('for regular metric', () => {
        it('defaults to median for non-rolled up metric', async () => {
          await common.navigateToApp('lens');
          await lens.switchDataPanelIndexPattern(tsdbDataView);
          await lens.waitForField('bytes_gauge');
          await lens.dragFieldToWorkspace('bytes_gauge', 'xyVisChart');
          expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
            'Median of bytes_gauge'
          );
        });

        it('does not show a warning', async () => {
          await lens.openDimensionEditor('lnsXY_yDimensionPanel');
          await testSubjects.missingOrFail('median-partial-warning');
          await lens.assertNoEditorWarning();
          await lens.closeDimensionEditor();
        });
      });

      describe('for rolled up metric (downsampled)', () => {
        it('defaults to average for rolled up metric', async () => {
          await lens.switchDataPanelIndexPattern(downsampleDataView.dataView);
          await lens.removeLayer();
          await lens.ensureLayerTabIsActive();
          await lens.waitForField('bytes_gauge');
          await lens.dragFieldToWorkspace('bytes_gauge', 'xyVisChart');
          expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
            'Average of bytes_gauge'
          );
        });
        it('shows warnings in editor when using median', async () => {
          await lens.openDimensionEditor('lnsXY_yDimensionPanel');
          await testSubjects.existOrFail('median-partial-warning');
          await testSubjects.click('lns-indexPatternDimension-median');
          await lens.waitForVisualization('xyVisChart');
          await lens.assertMessageListContains(
            'Median of bytes_gauge uses a function that is unsupported by rolled up data. Select a different function or change the time range.',
            'warning'
          );
        });
        it('shows warnings in dashboards as well', async () => {
          await lens.save('New', false, false, false, 'new');

          await dashboard.waitForRenderComplete();
          await lens.assertMessageListContains(
            'Median of bytes_gauge uses a function that is unsupported by rolled up data. Select a different function or change the time range.',
            'warning'
          );
        });
      });
    });
  });
}

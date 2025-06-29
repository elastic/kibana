/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function canvasLensTest({ getService, getPageObjects }: FtrProviderContext) {
  const { canvas, header, lens } = getPageObjects(['canvas', 'header', 'lens']);
  const esArchiver = getService('esArchiver');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const archives = {
    es: 'x-pack/test/functional/es_archives/canvas/logstash_lens',
    kbn: 'x-pack/test/functional/fixtures/kbn_archiver/canvas/lens',
  };

  describe('lens in canvas', function () {
    before(async () => {
      await esArchiver.load(archives.es);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(archives.kbn);
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-lens' });
      await canvas.goToListingPage();
      await canvas.createNewWorkpad();
    });

    after(async () => {
      await esArchiver.unload(archives.es);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('by-value', () => {
      it('creates new lens embeddable', async () => {
        await canvas.addNewPanel('Lens');
        await lens.goToTimeRange();
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
        await lens.saveAndReturn();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.exists('xyVisChart');
      });

      it('edits lens by-value embeddable', async () => {
        await header.waitUntilLoadingHasFinished();
        await dashboardPanelActions.clickEdit();
        await lens.saveAndReturn();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.exists('xyVisChart');
      });
    });

    describe('by-reference', () => {
      it('adds existing lens embeddable from the visualize library', async () => {
        await canvas.goToListingPageViaBreadcrumbs();
        await canvas.createNewWorkpad();
        await canvas.clickAddFromLibrary();
        await dashboardAddPanel.addEmbeddable('Artistpreviouslyknownaslens', 'lens');
        await testSubjects.existOrFail('embeddablePanelHeading-Artistpreviouslyknownaslens');
      });

      it('edits lens by-reference embeddable', async () => {
        await dashboardPanelActions.editPanelByTitle('Artistpreviouslyknownaslens');
        await lens.save('Artistpreviouslyknownaslens v2', false, true);
        await testSubjects.existOrFail('embeddablePanelHeading-Artistpreviouslyknownaslensv2');
      });

      it('renders lens visualization using savedLens expression', async () => {
        // load test workpad
        await canvas.goToListingPage();
        await canvas.loadFirstWorkpad('Test Workpad');
        await header.waitUntilLoadingHasFinished();

        await lens.assertLegacyMetric('Maximum of bytes', '16,788');
      });
    });

    describe('switch page smoke test', () => {
      it('loads embeddables on page change', async () => {
        await canvas.addNewPage();
        await canvas.goToPreviousPage();
        await header.waitUntilLoadingHasFinished();
        await lens.assertLegacyMetric('Maximum of bytes', '16,788');
      });
    });
  });
}

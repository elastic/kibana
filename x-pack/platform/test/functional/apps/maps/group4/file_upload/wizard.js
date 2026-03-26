/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';

export default function ({ getPageObjects, getService }) {
  const { geoFileUpload, maps } = getPageObjects(['geoFileUpload', 'maps']);
  const security = getService('security');
  const retry = getService('retry');

  describe('geo file upload wizard', () => {
    before(async () => {
      await security.testUser.setRoles([
        'global_maps_all',
        'geoall_data_writer',
        'global_index_pattern_management_all',
      ]);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    // describe block is testing a workflow and individual tests are not designed to be run out of order
    describe('preview layer workflow', () => {
      before(async () => {
        await maps.openNewMap();
        await maps.clickAddLayer();
        await maps.selectFileUploadCard();
        await geoFileUpload.previewGeoJsonFile(path.join(__dirname, 'files', 'point.json'));
        await maps.waitForLayersToLoad();
      });

      it('should add preview layer to map', async () => {
        const numberOfLayers = await maps.getNumberOfLayers();
        expect(numberOfLayers).to.be(2);

        const hasLayer = await maps.doesLayerExist('point');
        expect(hasLayer).to.be(true);
      });

      it('should replace preivew layer on file change', async () => {
        await geoFileUpload.previewGeoJsonFile(path.join(__dirname, 'files', 'polygon.json'));
        await maps.waitForLayersToLoad();

        const numberOfLayers = await maps.getNumberOfLayers();
        expect(numberOfLayers).to.be(2);

        const hasLayer = await maps.doesLayerExist('polygon');
        expect(hasLayer).to.be(true);
      });

      it('should disable next button when index already exists', async () => {
        await retry.try(async () => {
          expect(await geoFileUpload.isNextButtonEnabled()).to.be(true);
        });

        // "geo_shapes" index already exists, its added by es_archive
        await geoFileUpload.setIndexName('geo_shapes');
        await retry.try(async () => {
          expect(await geoFileUpload.isNextButtonEnabled()).to.be(false);
        });
      });

      it('should enable next button when index name is changed', async () => {
        await geoFileUpload.setIndexName('polygon');
        await retry.try(async () => {
          expect(await geoFileUpload.isNextButtonEnabled()).to.be(true);
        });
      });

      it('should remove preview layer on cancel', async () => {
        await maps.cancelLayerAdd();

        await maps.waitForLayerDeleted('polygon');
        const numberOfLayers = await maps.getNumberOfLayers();
        expect(numberOfLayers).to.be(1);
      });
    });
  });
}

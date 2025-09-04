/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export default function ({ getPageObjects, getService }) {
  const { geoFileUpload, maps } = getPageObjects(['geoFileUpload', 'maps']);
  const security = getService('security');
  const retry = getService('retry');

  describe('geojson file upload', () => {
    let indexName = '';
    before(async () => {
      await security.testUser.setRoles([
        'global_maps_all',
        'geoall_data_writer',
        'global_index_pattern_management_all',
      ]);
      await maps.openNewMap();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should preview part of geojson file', async () => {
      await maps.clickAddLayer();
      await maps.selectFileUploadCard();
      await geoFileUpload.previewGeoJsonFile(
        path.join(__dirname, 'files', 'world_countries_v7.geo.json')
      );
      await maps.waitForLayersToLoad();

      const numberOfLayers = await maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      const tooltipText = await maps.getLayerTocTooltipMsg('world_countries_v7');
      expect(tooltipText).to.be('world_countries_v7\nResults limited to 76 features, 41% of file.');
    });

    it('should import geojson', async () => {
      indexName = uuidv4();
      await geoFileUpload.setIndexName(indexName);
      await geoFileUpload.uploadFile();

      const statusText = await geoFileUpload.getFileUploadStatusCalloutMsg();
      expect(statusText).to.be('File upload complete\nIndexed 250 features.');
    });

    it('should add as document layer', async () => {
      await geoFileUpload.addFileAsDocumentLayer();
      await maps.waitForLayersToLoad();

      const numberOfLayers = await maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      await retry.try(async () => {
        await maps.waitForLayersToLoad();
        const tooltipText = await maps.getLayerTocTooltipMsg(indexName);
        expect(tooltipText).to.be(`${indexName}\nFound ~281 documents. This count is approximate.`);
      });
    });
  });
}

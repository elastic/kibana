/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const { common, visualize, maps, timePicker } = getPageObjects([
    'common',
    'visualize',
    'maps',
    'timePicker',
  ]);

  describe('tile_map visualization', () => {
    before(async () => {
      await common.navigateToApp('visualize');
      await visualize.loadSavedVisualization('Visualization TileMap', {
        navigateToVisualize: false,
      });
      await timePicker.setAbsoluteRange(timePicker.defaultStartTime, timePicker.defaultEndTime);
      await maps.waitForLayersToLoad();
    });

    it('should render tile_map with map embeddable', async () => {
      await maps.openLegend();
      await maps.waitForLayersToLoad();

      expect(await maps.getNumberOfLayers()).to.eql(2);
      expect(await maps.doesLayerExist('Visualization TileMap')).to.be(true);
    });
  });
}

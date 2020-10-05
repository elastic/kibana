/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addLayer } from './layer_actions';
import { LayerDescriptor } from '../../common/descriptor_types';
import { LICENSED_FEATURES } from '../licensed_features';

const getStoreMock = jest.fn();
const dispatchMock = jest.fn();

describe('layer_actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('addLayer', () => {
    const notifyLicensedFeatureUsageMock = jest.fn();

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../licensed_features').notifyLicensedFeatureUsage = (feature: LICENSED_FEATURES) => {
        notifyLicensedFeatureUsageMock(feature);
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').getMapReady = () => {
        return true;
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').createLayerInstance = () => {
        return {
          getLicensedFeatures() {
            return [LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE];
          },
        };
      };
    });

    it('should register feature-use', async () => {
      const action = addLayer(({} as unknown) as LayerDescriptor);
      await action(dispatchMock, getStoreMock);
      expect(notifyLicensedFeatureUsageMock).toHaveBeenCalledWith(
        LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE
      );
    });
  });
});

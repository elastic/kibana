/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addLayer } from './layer_actions';
import { LICENSED_FEATURES } from '../../common/constants';

const getStoreMock = jest.fn();
const dispatchMock = jest.fn();

describe('layer_actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('addLayer', () => {
    const registerFeatureUseMock = jest.fn();

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../kibana_services').registerFeatureUse = (register) => {
        registerFeatureUseMock(register);
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').getMapReady = () => {
        return true;
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').createLayerInstance = () => {
        return {
          getLicensedFeatures() {
            return [LICENSED_FEATURES.GEO_SHAPE_AGGS];
          },
        };
      };
    });

    it('should register feature-use', async () => {
      const action = addLayer({ foo: 'bar' });
      await action(dispatchMock, getStoreMock);
      expect(registerFeatureUseMock).toHaveBeenCalledWith(LICENSED_FEATURES.GEO_SHAPE_AGGS);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { mockKibanaValues, mockHttpValues } from '../../__mocks__';
jest.mock('../http', () => ({
  HttpLogic: { values: { http: mockHttpValues.http } },
}));

import { KibanaLogic, mountKibanaLogic } from './kibana_logic';

describe('KibanaLogic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  describe('mounts', () => {
    it('sets values from props', () => {
      mountKibanaLogic(mockKibanaValues);

      expect(KibanaLogic.values).toEqual({
        ...mockKibanaValues,
        navigateToUrl: expect.any(Function),
      });
    });

    it('gracefully handles missing configs', () => {
      mountKibanaLogic({ ...mockKibanaValues, config: undefined } as any);

      expect(KibanaLogic.values.config).toEqual({});
    });

    it('gracefully handles non-cloud installs', () => {
      mountKibanaLogic({ ...mockKibanaValues, cloud: undefined } as any);

      expect(KibanaLogic.values.cloud).toEqual({});
    });
  });

  describe('navigateToUrl()', () => {
    beforeEach(() => mountKibanaLogic(mockKibanaValues));

    it('runs paths through createHref before calling navigateToUrl', () => {
      KibanaLogic.values.navigateToUrl('/test');

      expect(mockKibanaValues.navigateToUrl).toHaveBeenCalledWith('/app/enterprise_search/test');
    });

    it('does not run paths through createHref if the shouldNotCreateHref option is passed', () => {
      KibanaLogic.values.navigateToUrl('/test', { shouldNotCreateHref: true });

      expect(mockKibanaValues.navigateToUrl).toHaveBeenCalledWith('/test');
    });
  });
});

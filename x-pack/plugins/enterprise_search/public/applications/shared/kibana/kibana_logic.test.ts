/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { mockKibanaValues } from '../../__mocks__';

import { KibanaLogic, mountKibanaLogic } from './kibana_logic';

describe('KibanaLogic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  describe('mounts', () => {
    it('sets values from props', () => {
      mountKibanaLogic(mockKibanaValues);

      expect(KibanaLogic.values).toEqual(mockKibanaValues);
    });

    it('gracefully handles missing configs', () => {
      mountKibanaLogic({ ...mockKibanaValues, config: undefined } as any);

      expect(KibanaLogic.values.config).toEqual({});
    });
  });
});

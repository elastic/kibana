/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UebaModel, UebaTableType, UebaDetailsTableType, UebaType } from './model';
import { setUebaQueriesActivePageToZero } from './helpers';
import { initialUebaState } from './reducer';

export const mockUebaState: UebaModel = initialUebaState;

describe('Ueba redux store', () => {
  describe('#setUebaQueriesActivePageToZero', () => {
    test('set activePage to zero for all queries in ueba page', () => {
      expect(setUebaQueriesActivePageToZero(mockUebaState, UebaType.page)).toEqual({
        [UebaTableType.riskScore]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: 'bytes_out',
          },
        },
      });
    });

    test('set activePage to zero for all queries in ip details  ', () => {
      expect(setUebaQueriesActivePageToZero(mockUebaState, UebaType.details)).toEqual({
        [UebaDetailsTableType.riskScore]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: 'bytes_out',
          },
        },
      });
    });
  });
});

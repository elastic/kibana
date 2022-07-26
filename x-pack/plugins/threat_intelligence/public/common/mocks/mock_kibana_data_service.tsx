/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import * as hook from '../../hooks/use_kibana';

export interface MockSearchServiceParams {
  searchSubject?: Observable<unknown>;
  calculateSubject?: TimeRangeBounds;
}

export const mockKibanaDataService = ({
  searchSubject,
  calculateSubject,
}: MockSearchServiceParams) => {
  const search = jest.fn().mockReturnValue(searchSubject);
  const showError = jest.fn();
  const getUiSetting = jest.fn();
  const calculateBounds = jest.fn().mockReturnValue(calculateSubject);

  (hook as jest.Mocked<typeof hook>).useKibana.mockReturnValue({
    services: {
      data: {
        search: { search, showError },
        query: { timefilter: { timefilter: { calculateBounds } } },
      },
      uiSettings: { get: getUiSetting },
    },
  } as any);

  return {
    search,
    showError,
    getUiSetting,
    calculateBounds,
  };
};

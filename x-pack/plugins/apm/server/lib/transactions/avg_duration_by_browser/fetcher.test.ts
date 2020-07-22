/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../helpers/setup_request';
import { fetcher } from './fetcher';

describe('fetcher', () => {
  it('performs a search', async () => {
    const search = jest.fn();
    const setup = ({
      client: { search },
      indices: {},
      uiFiltersES: [],
    } as unknown) as Setup & SetupTimeRange & SetupUIFilters;

    await fetcher({ serviceName: 'testServiceName', setup });

    expect(search).toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getTransactionAvgDurationByBrowser,
  Options,
  AvgDurationByBrowserAPIResponse
} from '.';
import * as transformerModule from './transformer';
import * as fetcherModule from './fetcher';
import { response } from './__fixtures__/responses';

describe('getAvgDurationByBrowser', () => {
  it('returns a transformed response', async () => {
    const transformer = jest
      .spyOn(transformerModule, 'transformer')
      .mockReturnValueOnce(({} as unknown) as AvgDurationByBrowserAPIResponse);
    const search = () => {};
    const options = ({
      setup: { client: { search }, indices: {}, uiFiltersES: [] }
    } as unknown) as Options;
    jest
      .spyOn<{ fetcher: any }, 'fetcher'>(fetcherModule, 'fetcher')
      .mockResolvedValueOnce(response);

    await getTransactionAvgDurationByBrowser(options);

    expect(transformer).toHaveBeenCalledWith({ response });
  });
});

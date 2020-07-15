/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlUrlGenerator } from './url_generator';

describe('MlUrlGenerator', () => {
  const urlGenerator = new MlUrlGenerator({
    appBasePath: '/app/ml',
    useHash: false,
  });

  it('should generate valid URL for the Anomaly Explorer page', async () => {
    const url = await urlGenerator.createUrl({
      page: 'explorer',
      jobIds: ['test-job'],
      mlExplorerSwimlane: { viewByFromPage: 2, viewByPerPage: 20 },
    });
    expect(url).toBe(
      '/app/ml#/explorer?_g=(ml:(jobIds:!(test-job)))&_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFromPage:2,viewByPerPage:20))'
    );
  });

  it('should throw an error in case the page is not provided', async () => {
    expect.assertions(1);

    // @ts-ignore
    await urlGenerator.createUrl({ jobIds: ['test-job'] }).catch((e) => {
      expect(e.message).toEqual('Page type is not provided or unknown');
    });
  });
});

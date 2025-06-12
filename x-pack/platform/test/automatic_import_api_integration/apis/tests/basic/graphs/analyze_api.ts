/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postAnalyzeApi } from '../../../../common/lib/api/analyze_api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { User } from '../../../../common/lib/authentication/types';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('Run analyze api', () => {
    it('should get 404 when trying to run analyze_api with basic license', async () => {
      return await postAnalyzeApi({
        supertest,
        req: {
          dataStreamTitle: 'some data stream',
          connectorId: 'bedrock-connector',
          pathOptions: {
            '/path1': 'Returns the data from path1',
            '/path2': 'Returns the data from path2',
          },
        },
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
    });
  });
};

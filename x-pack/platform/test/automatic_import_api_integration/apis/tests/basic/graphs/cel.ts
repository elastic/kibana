/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postCelInput } from '../../../../common/lib/api/cel';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { User } from '../../../../common/lib/authentication/types';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('Run cel', () => {
    it('should get 404 when trying to run cel with basic license', async () => {
      return await postCelInput({
        supertest,
        req: {
          dataStreamTitle: 'some data stream',
          connectorId: 'bedrock-connector',
          celDetails: {
            path: '/path1',
            auth: 'basic',
            openApiDetails: {
              operation: '{ operationJson}',
              schemas: '{schemasJson}',
              auth: '{authJson}',
            },
          },
        },
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
    });
  });
};

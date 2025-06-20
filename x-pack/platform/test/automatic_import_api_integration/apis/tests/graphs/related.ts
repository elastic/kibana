/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postRelated } from '../../../common/lib/api/related';
import { User } from '../../../common/lib/authentication/types';
import { BadRequestError } from '../../../common/lib/error/error';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  describe('Run related', () => {
    it('should get 400 when trying to run related with invalid json', async () => {
      const response = await postRelated({
        supertest,
        req: {
          packageName: 'some-package',
          dataStreamName: 'some-data-stream',
          rawSamples: ['{test:json}'],
          samplesFormat: {
            name: 'json',
          },
          connectorId: 'preconfigured-bedrock',
          currentPipeline: { processors: [] },
        },
        expectedHttpCode: 400,
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
      if (response instanceof BadRequestError) {
        expect(response.message).to.be(
          "Expected property name or '}' in JSON at position 1 (line 1 column 2)"
        );
      } else {
        expect().fail('Expected BadRequestError');
      }
    });
    it('should get 400 when trying to run related without connector action', async () => {
      const response = await postRelated({
        supertest,
        req: {
          packageName: 'some-package',
          dataStreamName: 'some-data-stream',
          rawSamples: ['{test:json}'],
          samplesFormat: {
            name: 'json',
          },
          connectorId: 'preconfigured-dummy',
          currentPipeline: { processors: [] },
        },
        expectedHttpCode: 400,
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
      if (response instanceof BadRequestError) {
        expect(response.message).to.be('Saved object [action/preconfigured-dummy] not found');
      } else {
        expect().fail('Expected BadRequestError');
      }
    });
  });
}

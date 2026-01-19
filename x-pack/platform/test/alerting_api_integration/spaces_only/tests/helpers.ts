/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Agent as SuperTestAgent } from 'supertest';
import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { Spaces } from '../scenarios';
import { getUrlPrefix } from '../../common/lib';

export async function buildUp(getService: FtrProviderContext['getService']) {
  const spacesService = getService('spaces');
  for (const space of Object.values(Spaces)) {
    if (space.id === 'default') continue;

    const { id, name, disabledFeatures } = space;
    await spacesService.create({ id, name, disabledFeatures });
  }
}

export async function tearDown(getService: FtrProviderContext['getService']) {
  const kibanaServer = getService('kibanaServer');
  await kibanaServer.savedObjects.cleanStandardList();

  const spacesService = getService('spaces');
  for (const space of Object.values(Spaces)) await spacesService.delete(space.id);
}

export const runSoon = async ({
  id,
  supertest,
  retry,
  spaceId = Spaces.space1.id,
}: {
  id: string;
  supertest: SuperTestAgent;
  retry: RetryService;
  spaceId?: string;
}) => {
  return retry.try(async () => {
    await supertest
      .post(`${getUrlPrefix(spaceId)}/internal/alerting/rule/${id}/_run_soon`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  });
};

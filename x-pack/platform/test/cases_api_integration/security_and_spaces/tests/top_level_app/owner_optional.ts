/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createCase, deleteAllCaseItems } from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('optional owner on create', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('creates a stack case when several solutions exist and no owner is given', async () => {
      const { owner, ...withoutOwner } = getPostCaseRequest();
      const theCase = await createCase(supertest, withoutOwner as CasePostRequest);

      expect(theCase.owner).to.be('cases');
    });

    it('keeps an explicit owner', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner: 'observability' }));

      expect(theCase.owner).to.be('observability');
    });
  });
};

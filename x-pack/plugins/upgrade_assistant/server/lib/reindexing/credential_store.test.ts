/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReindexStep, ReindexStatus } from '../../../common/types';
import { Credential, credentialStoreFactory } from './credential_store';

describe('credentialStore', () => {
  it('retrieves the same credentials for the same state', () => {
    const creds = { key: '1' } as Credential;
    const reindexOp = {
      id: 'asdf',
      type: 'type',
      references: [],
      attributes: {
        indexName: 'test',
        newIndexName: 'new-index',
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
      },
    };

    const credStore = credentialStoreFactory();
    credStore.set(reindexOp, creds);
    expect(credStore.get(reindexOp)).toEqual(creds);
  });

  it('does retrieve credentials if the state is changed', () => {
    const creds = { key: '1' } as Credential;
    const reindexOp = {
      id: 'asdf',
      type: 'type',
      references: [],
      attributes: {
        indexName: 'test',
        newIndexName: 'new-index',
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
      },
    };

    const credStore = credentialStoreFactory();
    credStore.set(reindexOp, creds);

    reindexOp.attributes.lastCompletedStep = 0;
    expect(credStore.get(reindexOp)).not.toBeDefined();
  });
});

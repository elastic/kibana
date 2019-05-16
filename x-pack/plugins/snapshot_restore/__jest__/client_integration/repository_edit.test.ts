/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment, pageHelpers, nextTick, TestBed } from './helpers';
import { REPOSITORY_EDIT } from './helpers/constant';

const { setup } = pageHelpers.repositoryEdit;

describe('<RepositoryEdit />', () => {
  let testBed: TestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    // mock get repository ({ repository: REPOSITORY_EDIT, snapshots: { count: 0 } })

    testBed = await setup();

    await act(async () => {
      await nextTick();
      testBed.component.update();
    });
  });

  test('should populate the form fields with the values from the auto-follow pattern loaded', () => {
    const { find } = testBed;
    // stepTwo title === name
    // location === settings -> location
    // chunk size === settings -> chunkSize
  });
});

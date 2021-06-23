/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';

describe('<EditPolicy /> request flyout', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  test('renders a json in flyout for a default policy', async () => {
    const { find, component } = testBed;
    await act(async () => {
      find('requestButton').simulate('click');
    });
    component.update();

    const json = component.find(`code`).text();
    const expected = `PUT _ilm/policy/my_policy\n${JSON.stringify(
      {
        policy: {
          phases: {
            hot: {
              min_age: '0ms',
              actions: {
                rollover: {
                  max_age: '30d',
                  max_primary_shard_size: '50gb',
                },
              },
            },
          },
        },
      },
      null,
      2
    )}`;
    expect(json).toBe(expected);
  });
});

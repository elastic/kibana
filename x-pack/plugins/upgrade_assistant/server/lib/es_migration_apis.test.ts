/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { getUpgradeAssistantStatus } from './es_migration_apis';

import { DeprecationAPIResponse } from 'src/legacy/core_plugins/elasticsearch';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

describe('getUpgradeAssistantStatus', () => {
  let deprecationsResponse: DeprecationAPIResponse;

  const callWithRequest = jest.fn().mockImplementation(async (req, api, { path }) => {
    if (path === '/_migration/deprecations') {
      return deprecationsResponse;
    } else {
      throw new Error(`Unexpected API call: ${path}`);
    }
  });

  beforeEach(() => {
    deprecationsResponse = _.cloneDeep(fakeDeprecations);
  });

  it('calls /_migration/deprecations', async () => {
    await getUpgradeAssistantStatus(callWithRequest, {} as any, '/');
    expect(callWithRequest).toHaveBeenCalledWith({}, 'transport.request', {
      path: '/_migration/deprecations',
      method: 'GET',
    });
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeAssistantStatus(callWithRequest, {} as any, '/');
    expect(resp).toMatchSnapshot();
  });
});

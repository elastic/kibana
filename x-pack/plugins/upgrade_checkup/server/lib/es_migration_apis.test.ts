/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { getUpgradeCheckupStatus } from './es_migration_apis';

import {
  AssistanceAPIResponse,
  DeprecationAPIResponse,
  DeprecationInfo,
} from 'src/core_plugins/elasticsearch';
import fakeAssistance from './__fixtures__/fake_assistance.json';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

describe('getUpgradeCheckupStatus', () => {
  let assistanceResponse: AssistanceAPIResponse;
  let deprecationsResponse: DeprecationAPIResponse;

  const callWithRequest = jest.fn().mockImplementation(async (req, api, { path }) => {
    if (path === '/_xpack/migration/assistance') {
      return assistanceResponse;
    } else if (path === '/_xpack/migration/deprecations') {
      return deprecationsResponse;
    } else {
      throw new Error(`Unexpected API call: ${path}`);
    }
  });

  beforeEach(() => {
    assistanceResponse = _.cloneDeep(fakeAssistance);
    deprecationsResponse = _.cloneDeep(fakeDeprecations);
  });

  it('calls /_xpack/migration/assistance', async () => {
    await getUpgradeCheckupStatus(callWithRequest, {} as any, '/');
    expect(callWithRequest).toHaveBeenCalledWith({}, 'transport.request', {
      path: '/_xpack/migration/assistance',
      method: 'GET',
    });
  });

  it('calls /_xpack/migration/deprecations', async () => {
    await getUpgradeCheckupStatus(callWithRequest, {} as any, '/');
    expect(callWithRequest).toHaveBeenCalledWith({}, 'transport.request', {
      path: '/_xpack/migration/deprecations',
      method: 'GET',
    });
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeCheckupStatus(callWithRequest, {} as any, '/');
    expect(resp).toMatchSnapshot();
  });

  it('appends deprecations for indices that need reindex', async () => {
    assistanceResponse = { indices: { myIndex: { action_required: 'reindex' } } };
    const resp = await getUpgradeCheckupStatus(callWithRequest, {} as any, '/');
    const reindexDeprecation = resp.indices.find(
      i =>
        i.index === 'myIndex' &&
        i.message === 'This index must be reindexed in order to upgrade the Elastic Stack.'
    );
    expect(reindexDeprecation).toBeTruthy();
  });

  it('appends deprecations for indices that need upgrade', async () => {
    assistanceResponse = { indices: { '.watches': { action_required: 'upgrade' } } };
    const resp = await getUpgradeCheckupStatus(callWithRequest, {} as any, '/');
    const reindexDeprecation = resp.indices.find(
      i =>
        i.index === '.watches' &&
        i.message === 'This index must be upgraded in order to upgrade the Elastic Stack.'
    );
    expect(reindexDeprecation).toBeTruthy();
  });

  describe('reindexing button', () => {
    it('adds an action for reindexing in console app', async () => {
      assistanceResponse = { indices: { myIndex: { action_required: 'reindex' } } };
      deprecationsResponse = { index_settings: {}, cluster_settings: [], node_settings: [] };
      const resp = await getUpgradeCheckupStatus(callWithRequest, {} as any, '');

      // Adds a uiButtons property with the documentation label.
      expect(resp.indices[0].actions![0]).toMatchInlineSnapshot(`
Object {
  "label": "Reindex in Console",
  "url": "/app/kibana#/dev_tools/console?load_from=%2Fapi%2Fupgrade_checkup%2Freindex%2Fconsole_template%2FmyIndex.json",
}
`);
    });

    it('prepends basePath', async () => {
      assistanceResponse = { indices: { myIndex: { action_required: 'reindex' } } };
      deprecationsResponse = { index_settings: {}, cluster_settings: [], node_settings: [] };
      const resp = await getUpgradeCheckupStatus(callWithRequest, {} as any, '/mybasepath');

      // Adds a uiButtons property with the documentation label.
      expect(resp.indices[0].actions![0]).toMatchInlineSnapshot(`
Object {
  "label": "Reindex in Console",
  "url": "/mybasepath/app/kibana#/dev_tools/console?load_from=%2Fmybasepath%2Fapi%2Fupgrade_checkup%2Freindex%2Fconsole_template%2FmyIndex.json",
}
`);
    });
  });
});

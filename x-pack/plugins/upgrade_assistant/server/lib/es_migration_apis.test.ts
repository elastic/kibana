/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { getUpgradeAssistantStatus } from './es_migration_apis';

import { DeprecationAPIResponse } from 'src/legacy/core_plugins/elasticsearch';
import { CURRENT_MAJOR_VERSION } from '../../common/version';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

describe('getUpgradeAssistantStatus', () => {
  let deprecationsResponse: DeprecationAPIResponse;

  const callWithRequest = jest.fn().mockImplementation(async (req, api, { path }) => {
    if (path === '/_xpack/migration/deprecations') {
      return deprecationsResponse;
    } else {
      throw new Error(`Unexpected API call: ${path}`);
    }
  });

  beforeEach(() => {
    deprecationsResponse = _.cloneDeep(fakeDeprecations);
  });

  it('calls /_xpack/migration/deprecations', async () => {
    await getUpgradeAssistantStatus(callWithRequest, {} as any, '/');
    expect(callWithRequest).toHaveBeenCalledWith({}, 'transport.request', {
      path: '/_xpack/migration/deprecations',
      method: 'GET',
    });
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeAssistantStatus(callWithRequest, {} as any, '/');
    expect(resp).toMatchSnapshot();
  });

  it('adds reindexing button with basePath', async () => {
    deprecationsResponse = {
      index_settings: {
        myIndex: [
          {
            level: 'critical',
            message: `Index created before ${CURRENT_MAJOR_VERSION}.0`,
            url: '',
          },
        ],
      },
      cluster_settings: [],
      node_settings: [],
    };
    const resp = await getUpgradeAssistantStatus(callWithRequest, {} as any, '/mybasepath');

    // Adds a uiButtons property with the documentation label.
    expect(resp.indices[0].actions![0]).toMatchInlineSnapshot(`
Object {
  "label": "Reindex in Console",
  "url": "/mybasepath/app/kibana#/dev_tools/console?load_from=%2Fmybasepath%2Fapi%2Fupgrade_assistant%2Freindex%2Fconsole_template%2FmyIndex.json",
}
`);
  });
});

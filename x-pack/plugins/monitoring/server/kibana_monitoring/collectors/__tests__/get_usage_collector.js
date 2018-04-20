/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { getUsageCollector } from '../get_usage_collector';
import { callClusterFactory } from '../../../../../xpack_main';

describe('getUsageCollector', () => {
  let clusterStub;
  let serverStub;
  let callClusterStub;

  beforeEach(() => {
    clusterStub = { callWithInternalUser: sinon.stub().returns(Promise.resolve({})) };
    serverStub = {
      plugins: {
        elasticsearch: {
          getCluster: sinon.stub()
        }
      },
      config: () => ({ get: sinon.stub() })
    };
    serverStub.plugins.elasticsearch.getCluster.withArgs('admin').returns(clusterStub);
    callClusterStub = callClusterFactory(serverStub).getCallClusterInternal();
  });

  it('correctly defines usage collector.', () => {
    const usageCollector = getUsageCollector(serverStub, callClusterStub);

    expect(usageCollector.type).to.be('kibana');
    expect(usageCollector.fetch).to.be.a(Function);
  });

  it('calls callWithInternalUser with the `search` method', async () => {
    callClusterStub.returns({
      aggregations: {
        types: {
          buckets: []
        }
      }
    });

    const usageCollector = getUsageCollector(serverStub, callClusterStub);
    await usageCollector.fetch();

    sinon.assert.calledOnce(clusterStub.callWithInternalUser);
    sinon.assert.calledWithExactly(clusterStub.callWithInternalUser, 'search', sinon.match({
      body: {
        query: {
          terms: {
            type: sinon.match.array
          },
        },
        aggs: {
          types: {
            terms: {
              field: 'type',
              size: sinon.match.number
            }
          }
        }
      }
    }));
  });
});

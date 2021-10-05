/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceNodes } from './';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { getServiceNodeMetadata } from '../services/get_service_node_metadata';
import { SERVICE_NODE_NAME_MISSING } from '../../../common/service_nodes';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { ESSearchRequest } from 'src/core/types/elasticsearch';

describe('service node queries', () => {
  const options = {
    mockResponse: (request: ESSearchRequest) => {
      if (request === 'get_service_agent_ids') {
        return {
          took: 123,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: {
              value: 0,
              relation: 'gte' as const,
              max_score: 0,
            },
            hits: [],
          },
          aggregations: {
            agents: {
              buckets: [{ key: 'foo' as const }],
            },
          },
        };
      }

      return {
        took: 123,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 0,
            relation: 'gte' as const,
            max_score: 0,
          },
          hits: [],
        },
      };
    },
    call: 1,
  };

  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches services nodes', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getServiceNodes({
          setup,
          serviceName: 'foo',
          kuery: '',
          environment: ENVIRONMENT_ALL.value,
          start: 0,
          end: 50000,
        }),
      options
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches metadata for a service node', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getServiceNodeMetadata({
          setup,
          serviceName: 'foo',
          serviceNodeName: 'bar',
          kuery: '',
          start: 0,
          end: 50000,
        }),
      options
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches metadata for unidentified service nodes', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getServiceNodeMetadata({
          setup,
          serviceName: 'foo',
          serviceNodeName: SERVICE_NODE_NAME_MISSING,
          kuery: '',
          start: 0,
          end: 50000,
        }),
      options
    );

    expect(mock.params).toMatchSnapshot();
  });
});

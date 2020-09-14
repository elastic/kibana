/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCPUChartData } from './by_agent/shared/cpu';
import { getMemoryChartData } from './by_agent/shared/memory';
import { getHeapMemoryChart } from './by_agent/java/heap_memory';
import { getNonHeapMemoryChart } from './by_agent/java/non_heap_memory';
import { getThreadCountChart } from './by_agent/java/thread_count';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { SERVICE_NODE_NAME_MISSING } from '../../../common/service_nodes';

describe('metrics queries', () => {
  let mock: SearchParamsMock;

  const createTests = (serviceNodeName?: string) => {
    it('fetches cpu chart data', async () => {
      mock = await inspectSearchParams((setup) =>
        getCPUChartData(setup, 'foo', serviceNodeName)
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('fetches memory chart data', async () => {
      mock = await inspectSearchParams((setup) =>
        getMemoryChartData(setup, 'foo', serviceNodeName)
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('fetches heap memory chart data', async () => {
      mock = await inspectSearchParams((setup) =>
        getHeapMemoryChart(setup, 'foo', serviceNodeName)
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('fetches non heap memory chart data', async () => {
      mock = await inspectSearchParams((setup) =>
        getNonHeapMemoryChart(setup, 'foo', serviceNodeName)
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('fetches thread count chart data', async () => {
      mock = await inspectSearchParams((setup) =>
        getThreadCountChart(setup, 'foo', serviceNodeName)
      );

      expect(mock.params).toMatchSnapshot();
    });
  };

  afterEach(() => {
    mock.teardown();
  });

  describe('without a service node name', () => {
    createTests();
  });

  describe('with service_node_name_missing', () => {
    createTests(SERVICE_NODE_NAME_MISSING);
  });

  describe('with a service node name', () => {
    createTests('bar');
  });
});

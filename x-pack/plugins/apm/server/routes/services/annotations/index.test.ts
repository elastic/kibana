/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../../../src/core/types/elasticsearch';
import {
  inspectSearchParams,
  SearchParamsMock,
} from '../../../utils/test_helpers';
import { getDerivedServiceAnnotations } from './get_derived_service_annotations';
import multipleAgents from './__fixtures__/multiple_agents.json';
import noAgents from './__fixtures__/no_agents.json';
import oneAgent from './__fixtures__/one_agent.json';
import nodeFirstSeen from './__fixtures__/node_first_seen.json';
import nodeFirstSeenWithVersion from './__fixtures__/node_first_seen_with_version.json';

describe('getServiceAnnotations', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  describe('with 0 agents', () => {
    it('returns no annotations', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            start: 1528113600000,
            end: 1528977600000,
          }),
        {
          mockResponse: () =>
            noAgents as ESSearchResponse<
              unknown,
              ESSearchRequest,
              {
                restTotalHitsAsInt: false;
              }
            >,
        }
      );

      expect(mock.response).toEqual([]);
    });
  });

  describe('with 1 agent', () => {
    it('returns one annotation', async () => {
      const responses = [
        oneAgent,
        nodeFirstSeen,
      ];
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            start: 1528113600000,
            end: 1528977600000,
          }),
        {
          mockResponse: () =>
            (responses.shift() as unknown) as ESSearchResponse<
              unknown,
              ESSearchRequest,
              {
                restTotalHitsAsInt: false;
              }
            >,
        }
      );

      expect(mock.spy.mock.calls.length).toBe(2);

      expect(mock.response).toEqual([
        {
          id: 'agent2',
          text: 'Started node',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'node-started',
        },
      ]);
    });
  });

  describe('with more than 1 agent', () => {
    it('returns two annotations', async () => {
      const responses = [
        multipleAgents,
        nodeFirstSeen,
        nodeFirstSeen,
      ];
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            start: 1528113600000,
            end: 1528977600000,
          }),
        {
          mockResponse: () =>
            responses.shift() as unknown as ESSearchResponse<
              unknown,
              ESSearchRequest,
              {
                restTotalHitsAsInt: false;
              }
            >,
        }
      );

      expect(mock.spy.mock.calls.length).toBe(3);

      expect(mock.response).toEqual([
        {
          id: 'agent2',
          text: 'Started node',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'node-started',
        },
        {
          id: 'agent1',
          text: 'Started node',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'node-started',
        },
      ]);
    });
  });

  describe('with 1 agent with version', () => {
    it('returns one annotation', async () => {
      const responses = [
        oneAgent,
        nodeFirstSeenWithVersion,
      ];
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            start: 1528113600000,
            end: 1528977600000,
          }),
        {
          mockResponse: () =>
            (responses.shift() as unknown) as ESSearchResponse<
              unknown,
              ESSearchRequest,
              {
                restTotalHitsAsInt: false;
              }
            >,
        }
      );

      expect(mock.spy.mock.calls.length).toBe(2);

      expect(mock.response).toEqual([
        {
          id: 'agent2',
          text: 'Started node with Version 1.0',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'node-started',
        },
      ]);
    });
  });
});

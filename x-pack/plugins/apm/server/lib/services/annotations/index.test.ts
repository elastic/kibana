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
import multipleVersions from './__fixtures__/multiple_versions.json';
import noVersions from './__fixtures__/no_versions.json';
import oneVersion from './__fixtures__/one_version.json';
import versionsFirstSeen from './__fixtures__/versions_first_seen.json';
import multipleNodes from './__fixtures__/multiple_nodes.json';

describe('getServiceAnnotations', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  describe('with 0 versions', () => {
    it('returns no annotations', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            serviceVersionPerServiceNode: false,
          }),
        {
          mockResponse: () =>
            noVersions as ESSearchResponse<
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

  describe('with 1 version', () => {
    it('returns no annotations', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            serviceVersionPerServiceNode: false,
          }),
        {
          mockResponse: () =>
            oneVersion as ESSearchResponse<
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

  describe('with more than 1 version', () => {
    it('returns two annotations', async () => {
      const responses = [
        multipleVersions,
        versionsFirstSeen,
        versionsFirstSeen,
      ];
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            serviceVersionPerServiceNode: false,
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

      expect(mock.spy.mock.calls.length).toBe(3);

      expect(mock.response).toEqual([
        {
          id: '8.0.0',
          text: '8.0.0',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'version',
        },
        {
          id: '7.5.0',
          text: '7.5.0',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'version',
        },
      ]);
    });
  });

  describe('with more than 1 version and more than 1 node', () => {
    it('returns four annotations', async () => {
      const responses = [
        multipleVersions,
        multipleNodes,
        multipleNodes,
      ];
      mock = await inspectSearchParams(
        (setup) =>
          getDerivedServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar',
            searchAggregatedTransactions: false,
            serviceVersionPerServiceNode: true,
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

      expect(mock.spy.mock.calls.length).toBe(3);

      expect(mock.response).toEqual([
        {
          id: '8.0.0_node1',
          text: '8.0.0 (node1)',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'version',
        },
        {
          id: '8.0.0_node2',
          text: '8.0.0 (node2)',
          '@timestamp': new Date('2018-06-04T13:00:00.000Z').getTime(),
          type: 'version',
        },
        {
          id: '7.5.0_node1',
          text: '7.5.0 (node1)',
          '@timestamp': new Date('2018-06-04T12:00:00.000Z').getTime(),
          type: 'version',
        },
        {
          id: '7.5.0_node2',
          text: '7.5.0 (node2)',
          '@timestamp': new Date('2018-06-04T13:00:00.000Z').getTime(),
          type: 'version',
        },
      ]);
    });
  });
});

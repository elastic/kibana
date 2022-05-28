/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESSearchRequest,
  ESSearchResponse,
} from '@kbn/core/types/elasticsearch';
import {
  inspectSearchParams,
  SearchParamsMock,
} from '../../../utils/test_helpers';
import { getDerivedServiceAnnotations } from './get_derived_service_annotations';
import multipleVersions from './__fixtures__/multiple_versions.json';
import noVersions from './__fixtures__/no_versions.json';
import oneVersion from './__fixtures__/one_version.json';
import versionsFirstSeen from './__fixtures__/versions_first_seen.json';

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
            start: 0,
            end: 50000,
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
            start: 0,
            end: 50000,
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
});

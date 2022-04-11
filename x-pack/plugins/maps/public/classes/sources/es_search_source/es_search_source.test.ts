/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_GEO_FIELD_TYPE, SCALING_TYPES } from '../../../../common/constants';

jest.mock('../../../kibana_services');
jest.mock('./util/load_index_settings');

import { getIndexPatternService, getSearchService, getHttp } from '../../../kibana_services';
import { SearchSource } from 'src/plugins/data/public';

import { loadIndexSettings } from './util/load_index_settings';

import { ESSearchSource } from './es_search_source';
import { VectorSourceRequestMeta } from '../../../../common/descriptor_types';

const mockDescriptor = { indexPatternId: 'foo', geoField: 'bar' };

describe('ESSearchSource', () => {
  it('constructor', () => {
    const esSearchSource = new ESSearchSource(mockDescriptor);
    expect(esSearchSource instanceof ESSearchSource).toBe(true);
  });

  describe('IMvtVectorSource', () => {
    it('getTileSourceLayer', () => {
      const esSearchSource = new ESSearchSource(mockDescriptor);
      expect(esSearchSource.getTileSourceLayer()).toBe('hits');
    });

    describe('getTileUrl', () => {
      const geoFieldName = 'bar';
      const mockIndexPatternService = {
        get() {
          return {
            title: 'foobar-title-*',
            fields: {
              getByName() {
                return {
                  name: geoFieldName,
                  type: ES_GEO_FIELD_TYPE.GEO_SHAPE,
                };
              },
            },
          };
        },
      };

      beforeEach(async () => {
        const mockSearchSource = {
          setField: jest.fn(),
          getSearchRequestBody() {
            return { foobar: 'ES_DSL_PLACEHOLDER', params: this.setField.mock.calls };
          },
          setParent() {},
        };
        const mockSearchService = {
          searchSource: {
            async create() {
              return mockSearchSource as unknown as SearchSource;
            },
            createEmpty() {
              return mockSearchSource as unknown as SearchSource;
            },
          },
        };

        // @ts-expect-error
        getIndexPatternService.mockReturnValue(mockIndexPatternService);
        // @ts-expect-error
        getSearchService.mockReturnValue(mockSearchService);
        // @ts-expect-error
        loadIndexSettings.mockReturnValue({
          maxResultWindow: 1000,
        });
        // @ts-expect-error
        getHttp.mockReturnValue({
          basePath: {
            prepend(path: string) {
              return `rootdir${path}`;
            },
          },
        });
      });

      const searchFilters: VectorSourceRequestMeta = {
        isReadOnly: false,
        filters: [],
        zoom: 0,
        fieldNames: ['tooltipField', 'styleField'],
        timeFilters: {
          from: 'now',
          to: '15m',
          mode: 'relative',
        },
        sourceQuery: {
          query: 'tooltipField: foobar',
          language: 'KQL',
        },
        sourceMeta: null,
        applyGlobalQuery: true,
        applyGlobalTime: true,
        applyForceRefresh: true,
        isForceRefresh: false,
      };

      it('Should only include required props', async () => {
        const esSearchSource = new ESSearchSource({
          geoField: geoFieldName,
          indexPatternId: 'ipId',
        });
        const tileUrl = await esSearchSource.getTileUrl(searchFilters, '1234');
        expect(tileUrl).toBe(
          `rootdir/api/maps/mvt/getTile/{z}/{x}/{y}.pbf?geometryFieldName=bar&index=foobar-title-*&requestBody=(foobar%3AES_DSL_PLACEHOLDER%2Cparams%3A('0'%3A('0'%3Aindex%2C'1'%3A(fields%3A()%2Ctitle%3A'foobar-title-*'))%2C'1'%3A('0'%3Asize%2C'1'%3A1000)%2C'2'%3A('0'%3Afilter%2C'1'%3A!())%2C'3'%3A('0'%3Aquery)%2C'4'%3A('0'%3Aindex%2C'1'%3A(fields%3A()%2Ctitle%3A'foobar-title-*'))%2C'5'%3A('0'%3Aquery%2C'1'%3A(language%3AKQL%2Cquery%3A'tooltipField%3A%20foobar'))%2C'6'%3A('0'%3AfieldsFromSource%2C'1'%3A!(tooltipField%2CstyleField))%2C'7'%3A('0'%3Asource%2C'1'%3A!(tooltipField%2CstyleField))))&token=1234`
        );
      });
    });
  });

  describe('isFilterByMapBounds', () => {
    it('limit', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.LIMIT,
      });
      expect(esSearchSource.isFilterByMapBounds()).toBe(true);
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.isFilterByMapBounds()).toBe(false);
    });
  });

  describe('getJoinsDisabledReason', () => {
    it('limit', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.LIMIT,
      });
      expect(esSearchSource.getJoinsDisabledReason()).toBe(null);
    });
    it('blended layer', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.CLUSTERS,
      });
      expect(esSearchSource.getJoinsDisabledReason()).toBe(
        'Joins are not supported when scaling by clusters'
      );
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.getJoinsDisabledReason()).toBe(null);
    });
  });
});

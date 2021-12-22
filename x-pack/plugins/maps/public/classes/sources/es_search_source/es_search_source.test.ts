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
          `rootdir/api/maps/mvt/getTile/{z}/{x}/{y}.pbf?geometryFieldName=bar&index=foobar-title-*&requestBody=(foobar:ES_DSL_PLACEHOLDER,params:('0':('0':index,'1':(fields:(),title:'foobar-title-*')),'1':('0':size,'1':1000),'2':('0':filter,'1':!()),'3':('0':query),'4':('0':index,'1':(fields:(),title:'foobar-title-*')),'5':('0':query,'1':(language:KQL,query:'tooltipField: foobar')),'6':('0':fieldsFromSource,'1':!(tooltipField,styleField)),'7':('0':source,'1':!(tooltipField,styleField))))&token=1234`
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
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.getJoinsDisabledReason()).toBe(
        'Joins are not supported when scaling by vector tiles'
      );
    });
  });
});

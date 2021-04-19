/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_GEO_FIELD_TYPE, SCALING_TYPES } from '../../../../common/constants';

jest.mock('../../../kibana_services');
jest.mock('./load_index_settings');

import { getIndexPatternService, getSearchService, getHttp } from '../../../kibana_services';
import { SearchSource } from 'src/plugins/data/public';

import { loadIndexSettings } from './load_index_settings';

import { ESSearchSource } from './es_search_source';
import { DataMeta, VectorSourceRequestMeta } from '../../../../common/descriptor_types';

const mockDescriptor = { indexPatternId: 'foo', geoField: 'bar' };

describe('ESSearchSource', () => {
  test('constructor', () => {
    const esSearchSource = new ESSearchSource(mockDescriptor);
    expect(esSearchSource instanceof ESSearchSource).toBe(true);
  });

  describe('ITiledSingleLayerVectorSource', () => {
    test('mb-source params', () => {
      const esSearchSource = new ESSearchSource(mockDescriptor);
      expect(esSearchSource.getMinZoom()).toBe(0);
      expect(esSearchSource.getMaxZoom()).toBe(24);
      expect(esSearchSource.getLayerName()).toBe('source_layer');
    });

    describe('getUrlTemplateWithMeta', () => {
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
              return (mockSearchSource as unknown) as SearchSource;
            },
            createEmpty() {
              return (mockSearchSource as unknown) as SearchSource;
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
          queryLastTriggeredAt: '2019-04-25T20:53:22.331Z',
        },
        sourceMeta: null,
        applyGlobalQuery: true,
        applyGlobalTime: true,
      };

      test('Should only include required props', async () => {
        const esSearchSource = new ESSearchSource({
          geoField: geoFieldName,
          indexPatternId: 'ipId',
        });
        const urlTemplateWithMeta = await esSearchSource.getUrlTemplateWithMeta(searchFilters);
        expect(urlTemplateWithMeta.urlTemplate).toBe(
          `rootdir/api/maps/mvt/getTile/{z}/{x}/{y}.pbf?geometryFieldName=bar&index=foobar-title-*&requestBody=(foobar:ES_DSL_PLACEHOLDER,params:('0':('0':index,'1':(fields:(),title:'foobar-title-*')),'1':('0':size,'1':1000),'2':('0':filter,'1':!()),'3':('0':query),'4':('0':index,'1':(fields:(),title:'foobar-title-*')),'5':('0':query,'1':(language:KQL,query:'tooltipField: foobar',queryLastTriggeredAt:'2019-04-25T20:53:22.331Z')),'6':('0':fieldsFromSource,'1':!(tooltipField,styleField)),'7':('0':source,'1':!(tooltipField,styleField))))&geoFieldType=geo_shape`
        );
      });

      test('should include searchSourceId in urlTemplateWithMeta', async () => {
        const esSearchSource = new ESSearchSource({
          geoField: geoFieldName,
          indexPatternId: 'ipId',
        });
        const urlTemplateWithMeta = await esSearchSource.getUrlTemplateWithMeta({
          ...searchFilters,
          searchSessionId: '1',
        });
        expect(urlTemplateWithMeta.urlTemplate).toBe(
          `rootdir/api/maps/mvt/getTile/{z}/{x}/{y}.pbf?geometryFieldName=bar&index=foobar-title-*&requestBody=(foobar:ES_DSL_PLACEHOLDER,params:('0':('0':index,'1':(fields:(),title:'foobar-title-*')),'1':('0':size,'1':1000),'2':('0':filter,'1':!()),'3':('0':query),'4':('0':index,'1':(fields:(),title:'foobar-title-*')),'5':('0':query,'1':(language:KQL,query:'tooltipField: foobar',queryLastTriggeredAt:'2019-04-25T20:53:22.331Z')),'6':('0':fieldsFromSource,'1':!(tooltipField,styleField)),'7':('0':source,'1':!(tooltipField,styleField))))&geoFieldType=geo_shape&searchSessionId=1`
        );
      });
    });
  });

  describe('isFilterByMapBounds', () => {
    test('default', () => {
      const esSearchSource = new ESSearchSource(mockDescriptor);
      expect(esSearchSource.isFilterByMapBounds()).toBe(true);
    });
    test('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.isFilterByMapBounds()).toBe(false);
    });
  });

  describe('getJoinsDisabledReason', () => {
    test('default', () => {
      const esSearchSource = new ESSearchSource(mockDescriptor);
      expect(esSearchSource.getJoinsDisabledReason()).toBe(null);
    });
    test('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      expect(esSearchSource.getJoinsDisabledReason()).toBe(
        'Joins are not supported when scaling by mvt vector tiles'
      );
    });
  });

  describe('getFields', () => {
    test('default', () => {
      const esSearchSource = new ESSearchSource(mockDescriptor);
      const docField = esSearchSource.createField({ fieldName: 'prop1' });
      expect(docField.canReadFromGeoJson()).toBe(true);
    });
    test('mvt', () => {
      const esSearchSource = new ESSearchSource({
        ...mockDescriptor,
        scalingType: SCALING_TYPES.MVT,
      });
      const docField = esSearchSource.createField({ fieldName: 'prop1' });
      expect(docField.canReadFromGeoJson()).toBe(false);
    });
  });

  describe('canMaskTimeslice', () => {
    describe('results are not trimmed', () => {
      const resultsNotTrimmedMeta = ({
        areResultsTrimmed: false,
      } as unknown) as DataMeta;

      test('Can not mask timeslice when source is top hits', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.TOP_HITS,
          topHitsSplitField: 'entityId',
        });
        expect(esSearchSource.canMaskTimeslice(resultsNotTrimmedMeta)).toBe(false);
      });

      test('Can not mask timeslice when source is MVT', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.MVT,
        });
        expect(esSearchSource.canMaskTimeslice(resultsNotTrimmedMeta)).toBe(false);
      });

      test('Can mask timeslice when source is limit', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.LIMIT,
        });
        expect(esSearchSource.canMaskTimeslice(resultsNotTrimmedMeta)).toBe(true);
      });

      test('Can mask timeslice when source is cluster', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.CLUSTERS,
        });
        expect(esSearchSource.canMaskTimeslice(resultsNotTrimmedMeta)).toBe(true);
      });

      describe('results are from timeslice', () => {
        const resultsNotTrimmedAndFromTimesliceMeta = ({
          areResultsTrimmed: false,
          timeslice: { from: 1000, to: 2000 },
        } as unknown) as DataMeta;

        test('Can not mask timeslice when next timeslice is not provided', () => {
          const esSearchSource = new ESSearchSource({
            ...mockDescriptor,
            scalingType: SCALING_TYPES.LIMIT,
          });
          expect(esSearchSource.canMaskTimeslice(resultsNotTrimmedAndFromTimesliceMeta)).toBe(
            false
          );
        });

        test('Can not mask timeslice when next timeslice is outside data timeslice', () => {
          const esSearchSource = new ESSearchSource({
            ...mockDescriptor,
            scalingType: SCALING_TYPES.LIMIT,
          });
          expect(
            esSearchSource.canMaskTimeslice(resultsNotTrimmedAndFromTimesliceMeta, {
              from: 500,
              to: 1500,
            })
          ).toBe(false);
        });

        test('Can mask timeslice when next timeslice is contained by data timeslice', () => {
          const esSearchSource = new ESSearchSource({
            ...mockDescriptor,
            scalingType: SCALING_TYPES.LIMIT,
          });
          expect(
            esSearchSource.canMaskTimeslice(resultsNotTrimmedAndFromTimesliceMeta, {
              from: 1000,
              to: 1500,
            })
          ).toBe(true);
        });
      });
    });

    describe('results are trimmed', () => {
      const resultsTrimmedMeta = ({
        areResultsTrimmed: true,
      } as unknown) as DataMeta;

      test('Can not mask timeslice when source is limit', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.LIMIT,
        });
        expect(esSearchSource.canMaskTimeslice(resultsTrimmedMeta)).toBe(false);
      });

      test('Can not mask timeslice when source is cluster', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.CLUSTERS,
        });
        expect(esSearchSource.canMaskTimeslice(resultsTrimmedMeta)).toBe(false);
      });
    });

    describe('no previous data fetch', () => {
      const resultsTrimmedMeta = ({} as unknown) as DataMeta;

      test('Can not mask timeslice when source is limit', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.LIMIT,
        });
        expect(esSearchSource.canMaskTimeslice(resultsTrimmedMeta)).toBe(false);
      });

      test('Can not mask timeslice when source is cluster', () => {
        const esSearchSource = new ESSearchSource({
          ...mockDescriptor,
          scalingType: SCALING_TYPES.CLUSTERS,
        });
        expect(esSearchSource.canMaskTimeslice(resultsTrimmedMeta)).toBe(false);
      });
    });
  });
});

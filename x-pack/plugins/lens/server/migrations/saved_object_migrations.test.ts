/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import { getAllMigrations, LensDocShape } from './saved_object_migrations';
import {
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectUnsanitizedDoc,
} from 'src/core/server';
import {
  LensDocShape715,
  LensDocShape810,
  VisState716,
  VisStatePost715,
  VisStatePre715,
  VisState810,
  VisState820,
  VisState830,
} from './types';
import { layerTypes, MetricState } from '../../common';
import { Filter } from '@kbn/es-query';

describe('Lens migrations', () => {
  const migrations = getAllMigrations({}, {});
  describe('7.7.0 missing dimensions in XY', () => {
    const context = {} as SavedObjectMigrationContext;

    const example = {
      type: 'lens',
      id: 'mock-saved-object-id',
      attributes: {
        expression:
          'kibana\n| kibana_context  query="{\\"language\\":\\"kuery\\",\\"query\\":\\"\\"}" \n| lens_merge_tables layerIds="c61a8afb-a185-4fae-a064-fb3846f6c451" \n  tables={esaggs index="logstash-*" metricsAtAllLevels=false partialRows=false includeFormatHints=true aggConfigs="[{\\"id\\":\\"2cd09808-3915-49f4-b3b0-82767eba23f7\\",\\"enabled\\":true,\\"type\\":\\"max\\",\\"schema\\":\\"metric\\",\\"params\\":{\\"field\\":\\"bytes\\"}}]" | lens_rename_columns idMap="{\\"col-0-2cd09808-3915-49f4-b3b0-82767eba23f7\\":\\"2cd09808-3915-49f4-b3b0-82767eba23f7\\"}"}\n| lens_metric_chart title="Maximum of bytes" accessor="2cd09808-3915-49f4-b3b0-82767eba23f7"',
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [
              {
                id: 'logstash-*',
                title: 'logstash-*',
              },
            ],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                'c61a8afb-a185-4fae-a064-fb3846f6c451': {
                  columnOrder: ['2cd09808-3915-49f4-b3b0-82767eba23f7'],
                  columns: {
                    '2cd09808-3915-49f4-b3b0-82767eba23f7': {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Maximum of bytes',
                      operationType: 'max',
                      scale: 'ratio',
                      sourceField: 'bytes',
                    },
                    'd3e62a7a-c259-4fff-a2fc-eebf20b7008a': {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Minimum of bytes',
                      operationType: 'min',
                      scale: 'ratio',
                      sourceField: 'bytes',
                    },
                    'd6e40cea-6299-43b4-9c9d-b4ee305a2ce8': {
                      dataType: 'date',
                      isBucketed: true,
                      label: 'Date Histogram of @timestamp',
                      operationType: 'date_histogram',
                      params: {
                        interval: 'auto',
                      },
                      scale: 'interval',
                      sourceField: '@timestamp',
                    },
                  },
                  indexPatternId: 'logstash-*',
                },
              },
            },
          },
          filters: [],
          query: {
            language: 'kuery',
            query: '',
          },
          visualization: {
            accessor: '2cd09808-3915-49f4-b3b0-82767eba23f7',
            isHorizontal: false,
            layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
            layers: [
              {
                accessors: [
                  'd3e62a7a-c259-4fff-a2fc-eebf20b7008a',
                  '26ef70a9-c837-444c-886e-6bd905ee7335',
                ],
                layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
                seriesType: 'area',
                splitAccessor: '54cd64ed-2a44-4591-af84-b2624504569a',
                xAccessor: 'd6e40cea-6299-43b4-9c9d-b4ee305a2ce8',
              },
            ],
            legend: {
              isVisible: true,
              position: 'right',
            },
            preferredSeriesType: 'area',
          },
        },
        title: 'Artistpreviouslyknownaslens',
        visualizationType: 'lnsXY',
      },
    };

    it('should not change anything by XY visualizations', () => {
      const target = {
        ...example,
        attributes: {
          ...example.attributes,
          visualizationType: 'lnsMetric',
        },
      };
      const result = migrations['7.7.0'](target, context);
      expect(result).toEqual(target);
    });

    it('should handle missing layers', () => {
      const result = migrations['7.7.0'](
        {
          ...example,
          attributes: {
            ...example.attributes,
            state: {
              ...example.attributes.state,
              datasourceStates: {
                indexpattern: {
                  layers: [],
                },
              },
            },
          },
        },
        context
      );

      expect(result.attributes.state.visualization.layers).toEqual([
        {
          layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
          seriesType: 'area',
          // Removed split accessor
          splitAccessor: undefined,
          xAccessor: undefined,
          // Removed a yAcccessor
          accessors: [],
        },
      ]);
    });

    it('should remove only missing accessors', () => {
      const result = migrations['7.7.0'](example, context);

      expect(result.attributes.state.visualization.layers).toEqual([
        {
          layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
          seriesType: 'area',
          xAccessor: 'd6e40cea-6299-43b4-9c9d-b4ee305a2ce8',
          // Removed split accessor
          splitAccessor: undefined,
          // Removed a yAcccessor
          accessors: ['d3e62a7a-c259-4fff-a2fc-eebf20b7008a'],
        },
      ]);
    });
  });

  describe('7.8.0 auto timestamp', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;

    const example = {
      type: 'lens',
      id: 'mock-saved-object-id',
      attributes: {
        expression: `kibana
  | kibana_context query="{\\"query\\":\\"\\",\\"language\\":\\"kuery\\"}" filters="[]"
  | lens_merge_tables layerIds="bd09dc71-a7e2-42d0-83bd-85df8291f03c"
    tables={esaggs
      index="ff959d40-b880-11e8-a6d9-e546fe2bba5f"
      metricsAtAllLevels=false
      partialRows=false
      includeFormatHints=true
      aggConfigs={
        lens_auto_date
        aggConfigs="[{\\"id\\":\\"1d9cc16c-1460-41de-88f8-471932ecbc97\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"products.created_on\\",\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"auto\\",\\"drop_partials\\":false,\\"min_doc_count\\":0,\\"extended_bounds\\":{}}},{\\"id\\":\\"66115819-8481-4917-a6dc-8ffb10dd02df\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]"
      }
      | lens_rename_columns idMap="{\\"col-0-1d9cc16c-1460-41de-88f8-471932ecbc97\\":{\\"label\\":\\"products.created_on\\",\\"dataType\\":\\"date\\",\\"operationType\\":\\"date_histogram\\",\\"sourceField\\":\\"products.created_on\\",\\"isBucketed\\":true,\\"scale\\":\\"interval\\",\\"params\\":{\\"interval\\":\\"auto\\"},\\"id\\":\\"1d9cc16c-1460-41de-88f8-471932ecbc97\\"},\\"col-1-66115819-8481-4917-a6dc-8ffb10dd02df\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"operationType\\":\\"count\\",\\"suggestedPriority\\":0,\\"isBucketed\\":false,\\"scale\\":\\"ratio\\",\\"sourceField\\":\\"Records\\",\\"id\\":\\"66115819-8481-4917-a6dc-8ffb10dd02df\\"}}"
    }
  | xyVis
      xTitle="products.created_on"
      yTitle="Count of records"
      legend={legendConfig isVisible=true position="right"}
      layers={lens_xy_layer
        layerId="bd09dc71-a7e2-42d0-83bd-85df8291f03c"
        hide=false
        xAccessor="1d9cc16c-1460-41de-88f8-471932ecbc97"
        yScaleType="linear"
        xScaleType="time"
        isHistogram=true
        seriesType="bar_stacked"
        accessors="66115819-8481-4917-a6dc-8ffb10dd02df"
        columnToLabel="{\\"66115819-8481-4917-a6dc-8ffb10dd02df\\":\\"Count of records\\"}"
      }
          `,
        state: {
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              layers: {
                'bd09dc71-a7e2-42d0-83bd-85df8291f03c': {
                  indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                  columns: {
                    '1d9cc16c-1460-41de-88f8-471932ecbc97': {
                      label: 'products.created_on',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: 'products.created_on',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '66115819-8481-4917-a6dc-8ffb10dd02df': {
                      label: 'Count of records',
                      dataType: 'number',
                      operationType: 'count',
                      suggestedPriority: 0,
                      isBucketed: false,
                      scale: 'ratio',
                      sourceField: 'Records',
                    },
                  },
                  columnOrder: [
                    '1d9cc16c-1460-41de-88f8-471932ecbc97',
                    '66115819-8481-4917-a6dc-8ffb10dd02df',
                  ],
                },
              },
            },
          },
          datasourceMetaData: {
            filterableIndexPatterns: [
              { id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f', title: 'kibana_sample_data_ecommerce' },
            ],
          },
          visualization: {
            legend: { isVisible: true, position: 'right' },
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: 'bd09dc71-a7e2-42d0-83bd-85df8291f03c',
                accessors: ['66115819-8481-4917-a6dc-8ffb10dd02df'],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                xAccessor: '1d9cc16c-1460-41de-88f8-471932ecbc97',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        title: 'Bar chart',
        visualizationType: 'lnsXY',
      },
    };

    it('should remove the lens_auto_date expression', () => {
      const result = migrations['7.8.0'](example, context);
      expect(result.attributes.expression).toContain(`timeFields=\"products.created_on\"`);
    });

    it('should handle pre-migrated expression', () => {
      const input = {
        type: 'lens',
        id: 'mock-saved-object-id',
        attributes: {
          ...example.attributes,
          expression: `kibana
| kibana_context query="{\\"query\\":\\"\\",\\"language\\":\\"kuery\\"}" filters="[]"
| lens_merge_tables layerIds="bd09dc71-a7e2-42d0-83bd-85df8291f03c" 
  tables={esaggs index="ff959d40-b880-11e8-a6d9-e546fe2bba5f" metricsAtAllLevels=false partialRows=false includeFormatHints=true aggConfigs="[{\\"id\\":\\"1d9cc16c-1460-41de-88f8-471932ecbc97\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"products.created_on\\",\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"auto\\",\\"drop_partials\\":false,\\"min_doc_count\\":0,\\"extended_bounds\\":{}}},{\\"id\\":\\"66115819-8481-4917-a6dc-8ffb10dd02df\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]" timeFields=\"products.created_on\"}
| xyVis xTitle="products.created_on" yTitle="Count of records" legend={legendConfig isVisible=true position="right"} layers={}`,
        },
      };
      const result = migrations['7.8.0'](input, context);
      expect(result).toEqual(input);
    });
  });

  describe('7.10.0 references', () => {
    const context = {} as SavedObjectMigrationContext;

    const example = {
      id: 'mock-saved-object-id',
      attributes: {
        description: '',
        expression:
          'kibana\n| kibana_context  query="{\\"query\\":\\"NOT bytes > 5000\\",\\"language\\":\\"kuery\\"}" \n  filters="[{\\"meta\\":{\\"index\\":\\"90943e30-9a47-11e8-b64d-95841ca0b247\\",\\"alias\\":null,\\"negate\\":true,\\"disabled\\":false,\\"type\\":\\"phrase\\",\\"key\\":\\"geo.src\\",\\"params\\":{\\"query\\":\\"CN\\"}},\\"query\\":{\\"match_phrase\\":{\\"geo.src\\":\\"CN\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}},{\\"meta\\":{\\"index\\":\\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\\",\\"alias\\":null,\\"negate\\":true,\\"disabled\\":false,\\"type\\":\\"phrase\\",\\"key\\":\\"geoip.country_iso_code\\",\\"params\\":{\\"query\\":\\"US\\"}},\\"query\\":{\\"match_phrase\\":{\\"geoip.country_iso_code\\":\\"US\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}}]"\n| lens_merge_tables layerIds="9a27f85d-35a9-4246-81b2-48e7ee9b0707"\n  layerIds="3b7791e9-326e-40d5-a787-b7594e48d906" \n  tables={esaggs index="90943e30-9a47-11e8-b64d-95841ca0b247" metricsAtAllLevels=true partialRows=true includeFormatHints=true  aggConfigs="[{\\"id\\":\\"96352896-c508-4fca-90d8-66e9ebfce621\\",\\"enabled\\":true,\\"type\\":\\"terms\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"geo.src\\",\\"orderBy\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\",\\"order\\":\\"desc\\",\\"size\\":5,\\"otherBucket\\":false,\\"otherBucketLabel\\":\\"Other\\",\\"missingBucket\\":false,\\"missingBucketLabel\\":\\"Missing\\"}},{\\"id\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]" | lens_rename_columns idMap="{\\"col-0-96352896-c508-4fca-90d8-66e9ebfce621\\":{\\"label\\":\\"Top values of geo.src\\",\\"dataType\\":\\"string\\",\\"operationType\\":\\"terms\\",\\"scale\\":\\"ordinal\\",\\"sourceField\\":\\"geo.src\\",\\"isBucketed\\":true,\\"params\\":{\\"size\\":5,\\"orderBy\\":{\\"type\\":\\"column\\",\\"columnId\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\"},\\"orderDirection\\":\\"desc\\"},\\"id\\":\\"96352896-c508-4fca-90d8-66e9ebfce621\\"},\\"col-1-4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"operationType\\":\\"count\\",\\"isBucketed\\":false,\\"scale\\":\\"ratio\\",\\"sourceField\\":\\"Records\\",\\"id\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\"}}"}\n  tables={esaggs index="ff959d40-b880-11e8-a6d9-e546fe2bba5f" metricsAtAllLevels=true partialRows=true includeFormatHints=true  aggConfigs="[{\\"id\\":\\"77d8383e-f66e-471e-ae50-c427feedb5ba\\",\\"enabled\\":true,\\"type\\":\\"terms\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"geoip.country_iso_code\\",\\"orderBy\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\",\\"order\\":\\"desc\\",\\"size\\":5,\\"otherBucket\\":false,\\"otherBucketLabel\\":\\"Other\\",\\"missingBucket\\":false,\\"missingBucketLabel\\":\\"Missing\\"}},{\\"id\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]" | lens_rename_columns idMap="{\\"col-0-77d8383e-f66e-471e-ae50-c427feedb5ba\\":{\\"label\\":\\"Top values of geoip.country_iso_code\\",\\"dataType\\":\\"string\\",\\"operationType\\":\\"terms\\",\\"scale\\":\\"ordinal\\",\\"sourceField\\":\\"geoip.country_iso_code\\",\\"isBucketed\\":true,\\"params\\":{\\"size\\":5,\\"orderBy\\":{\\"type\\":\\"column\\",\\"columnId\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\"},\\"orderDirection\\":\\"desc\\"},\\"id\\":\\"77d8383e-f66e-471e-ae50-c427feedb5ba\\"},\\"col-1-a5c1b82d-51de-4448-a99d-6391432c3a03\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"operationType\\":\\"count\\",\\"isBucketed\\":false,\\"scale\\":\\"ratio\\",\\"sourceField\\":\\"Records\\",\\"id\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\"}}"}\n| xyVis xTitle="Top values of geo.src" yTitle="Count of records" legend={legendConfig isVisible=true position="right"} fittingFunction="None" \n  layers={lens_xy_layer layerId="9a27f85d-35a9-4246-81b2-48e7ee9b0707" hide=false xAccessor="96352896-c508-4fca-90d8-66e9ebfce621" yScaleType="linear" xScaleType="ordinal" isHistogram=false   seriesType="bar" accessors="4ce9b4c7-2ebf-4d48-8669-0ea69d973353" columnToLabel="{\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\":\\"Count of records\\"}"}\n  layers={lens_xy_layer layerId="3b7791e9-326e-40d5-a787-b7594e48d906" hide=false xAccessor="77d8383e-f66e-471e-ae50-c427feedb5ba" yScaleType="linear" xScaleType="ordinal" isHistogram=false   seriesType="bar" accessors="a5c1b82d-51de-4448-a99d-6391432c3a03" columnToLabel="{\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\":\\"Count of records [1]\\"}"}',
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [
              { id: '90943e30-9a47-11e8-b64d-95841ca0b247', title: 'kibana_sample_data_logs' },
              { id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f', title: 'kibana_sample_data_ecommerce' },
            ],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              layers: {
                '3b7791e9-326e-40d5-a787-b7594e48d906': {
                  columnOrder: [
                    '77d8383e-f66e-471e-ae50-c427feedb5ba',
                    'a5c1b82d-51de-4448-a99d-6391432c3a03',
                  ],
                  columns: {
                    '77d8383e-f66e-471e-ae50-c427feedb5ba': {
                      dataType: 'string',
                      isBucketed: true,
                      label: 'Top values of geoip.country_iso_code',
                      operationType: 'terms',
                      params: {
                        orderBy: {
                          columnId: 'a5c1b82d-51de-4448-a99d-6391432c3a03',
                          type: 'column',
                        },
                        orderDirection: 'desc',
                        size: 5,
                      },
                      scale: 'ordinal',
                      sourceField: 'geoip.country_iso_code',
                    },
                    'a5c1b82d-51de-4448-a99d-6391432c3a03': {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Count of records',
                      operationType: 'count',
                      scale: 'ratio',
                      sourceField: 'Records',
                    },
                  },
                  indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                },
                '9a27f85d-35a9-4246-81b2-48e7ee9b0707': {
                  columnOrder: [
                    '96352896-c508-4fca-90d8-66e9ebfce621',
                    '4ce9b4c7-2ebf-4d48-8669-0ea69d973353',
                  ],
                  columns: {
                    '4ce9b4c7-2ebf-4d48-8669-0ea69d973353': {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Count of records',
                      operationType: 'count',
                      scale: 'ratio',
                      sourceField: 'Records',
                    },
                    '96352896-c508-4fca-90d8-66e9ebfce621': {
                      dataType: 'string',
                      isBucketed: true,
                      label: 'Top values of geo.src',
                      operationType: 'terms',
                      params: {
                        orderBy: {
                          columnId: '4ce9b4c7-2ebf-4d48-8669-0ea69d973353',
                          type: 'column',
                        },
                        orderDirection: 'desc',
                        size: 5,
                      },
                      scale: 'ordinal',
                      sourceField: 'geo.src',
                    },
                  },
                  indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
                },
              },
            },
          },
          filters: [
            {
              $state: { store: 'appState' },
              meta: {
                alias: null,
                disabled: false,
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                key: 'geo.src',
                negate: true,
                params: { query: 'CN' },
                type: 'phrase',
              },
              query: { match_phrase: { 'geo.src': 'CN' } },
            },
            {
              $state: { store: 'appState' },
              meta: {
                alias: null,
                disabled: false,
                index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                key: 'geoip.country_iso_code',
                negate: true,
                params: { query: 'US' },
                type: 'phrase',
              },
              query: { match_phrase: { 'geoip.country_iso_code': 'US' } },
            },
          ],
          query: { language: 'kuery', query: 'NOT bytes > 5000' },
          visualization: {
            fittingFunction: 'None',
            layers: [
              {
                accessors: ['4ce9b4c7-2ebf-4d48-8669-0ea69d973353'],
                layerId: '9a27f85d-35a9-4246-81b2-48e7ee9b0707',
                position: 'top',
                seriesType: 'bar',
                showGridlines: false,
                xAccessor: '96352896-c508-4fca-90d8-66e9ebfce621',
              },
              {
                accessors: ['a5c1b82d-51de-4448-a99d-6391432c3a03'],
                layerId: '3b7791e9-326e-40d5-a787-b7594e48d906',
                seriesType: 'bar',
                xAccessor: '77d8383e-f66e-471e-ae50-c427feedb5ba',
              },
            ],
            legend: { isVisible: true, position: 'right' },
            preferredSeriesType: 'bar',
          },
        },
        title: 'mylens',
        visualizationType: 'lnsXY',
      },
      type: 'lens',
    };

    it('should remove expression', () => {
      const result = migrations['7.10.0'](example, context);
      expect(result.attributes.expression).toBeUndefined();
    });

    it('should list references for layers', () => {
      const result = migrations['7.10.0'](example, context);
      expect(
        result.references?.find(
          (ref) => ref.name === 'indexpattern-datasource-layer-3b7791e9-326e-40d5-a787-b7594e48d906'
        )?.id
      ).toEqual('ff959d40-b880-11e8-a6d9-e546fe2bba5f');
      expect(
        result.references?.find(
          (ref) => ref.name === 'indexpattern-datasource-layer-9a27f85d-35a9-4246-81b2-48e7ee9b0707'
        )?.id
      ).toEqual('90943e30-9a47-11e8-b64d-95841ca0b247');
    });

    it('should remove index pattern ids from layers', () => {
      const result = migrations['7.10.0'](example, context);
      expect(
        result.attributes.state.datasourceStates.indexpattern.layers[
          '3b7791e9-326e-40d5-a787-b7594e48d906'
        ].indexPatternId
      ).toBeUndefined();
      expect(
        result.attributes.state.datasourceStates.indexpattern.layers[
          '9a27f85d-35a9-4246-81b2-48e7ee9b0707'
        ].indexPatternId
      ).toBeUndefined();
    });

    it('should remove datsource meta data', () => {
      const result = migrations['7.10.0'](example, context);
      expect(result.attributes.state.datasourceMetaData).toBeUndefined();
    });

    it('should list references for filters', () => {
      const result = migrations['7.10.0'](example, context);
      expect(result.references?.find((ref) => ref.name === 'filter-index-pattern-0')?.id).toEqual(
        '90943e30-9a47-11e8-b64d-95841ca0b247'
      );
      expect(result.references?.find((ref) => ref.name === 'filter-index-pattern-1')?.id).toEqual(
        'ff959d40-b880-11e8-a6d9-e546fe2bba5f'
      );
    });

    it('should remove index pattern ids from filters', () => {
      const result = migrations['7.10.0'](example, context);
      expect(result.attributes.state.filters[0].meta.index).toBeUndefined();
      expect(result.attributes.state.filters[0].meta.indexRefName).toEqual(
        'filter-index-pattern-0'
      );
      expect(result.attributes.state.filters[1].meta.index).toBeUndefined();
      expect(result.attributes.state.filters[1].meta.indexRefName).toEqual(
        'filter-index-pattern-1'
      );
    });

    it('should list reference for current index pattern', () => {
      const result = migrations['7.10.0'](example, context);
      expect(
        result.references?.find(
          (ref) => ref.name === 'indexpattern-datasource-current-indexpattern'
        )?.id
      ).toEqual('ff959d40-b880-11e8-a6d9-e546fe2bba5f');
    });

    it('should remove current index pattern id from datasource state', () => {
      const result = migrations['7.10.0'](example, context);
      expect(
        result.attributes.state.datasourceStates.indexpattern.currentIndexPatternId
      ).toBeUndefined();
    });

    it('should produce a valid document', () => {
      const result = migrations['7.10.0'](example, context);
      // changes to the outcome of this are critical - this test is a safe guard to not introduce changes accidentally
      // if this test fails, make extra sure it's expected
      expect(result).toMatchSnapshot();
    });
  });

  describe('7.11.0 remove suggested priority', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;

    const example = {
      type: 'lens',
      id: 'mock-saved-object-id',
      attributes: {
        state: {
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              layers: {
                'bd09dc71-a7e2-42d0-83bd-85df8291f03c': {
                  indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                  columns: {
                    '1d9cc16c-1460-41de-88f8-471932ecbc97': {
                      label: 'products.created_on',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: 'products.created_on',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                      suggestedPriority: 0,
                    },
                    '66115819-8481-4917-a6dc-8ffb10dd02df': {
                      label: 'Count of records',
                      dataType: 'number',
                      operationType: 'count',
                      suggestedPriority: 1,
                      isBucketed: false,
                      scale: 'ratio',
                      sourceField: 'Records',
                    },
                  },
                  columnOrder: [
                    '1d9cc16c-1460-41de-88f8-471932ecbc97',
                    '66115819-8481-4917-a6dc-8ffb10dd02df',
                  ],
                },
              },
            },
          },
          datasourceMetaData: {
            filterableIndexPatterns: [
              { id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f', title: 'kibana_sample_data_ecommerce' },
            ],
          },
          visualization: {
            legend: { isVisible: true, position: 'right' },
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: 'bd09dc71-a7e2-42d0-83bd-85df8291f03c',
                accessors: ['66115819-8481-4917-a6dc-8ffb10dd02df'],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                xAccessor: '1d9cc16c-1460-41de-88f8-471932ecbc97',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        title: 'Bar chart',
        visualizationType: 'lnsXY',
      },
    };

    it('should remove the suggested priority from all columns', () => {
      const result = migrations['7.11.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const resultLayers = result.attributes.state.datasourceStates.indexpattern.layers;
      const layersWithSuggestedPriority = Object.values(resultLayers).reduce(
        (count, layer) =>
          count + Object.values(layer.columns).filter((col) => 'suggestedPriority' in col).length,
        0
      );

      expect(layersWithSuggestedPriority).toEqual(0);
    });
  });

  describe('7.12.0 restructure datatable state', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mock-saved-object-id',
      attributes: {
        state: {
          datasourceStates: {
            indexpattern: {},
          },
          visualization: {
            layers: [
              {
                layerId: 'first',
                columns: ['a', 'b', 'c'],
              },
            ],
            sorting: {
              columnId: 'a',
              direction: 'asc',
            },
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        title: 'Table',
        visualizationType: 'lnsDatatable',
      },
    };

    it('should not touch non datatable visualization', () => {
      const xyChart = {
        ...example,
        attributes: { ...example.attributes, visualizationType: 'xy' },
      };
      const result = migrations['7.12.0'](xyChart, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      expect(result).toBe(xyChart);
    });

    it('should remove layer array and reshape state', () => {
      const result = migrations['7.12.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      expect(result.attributes.state.visualization).toEqual({
        layerId: 'first',
        columns: [
          {
            columnId: 'a',
          },
          {
            columnId: 'b',
          },
          {
            columnId: 'c',
          },
        ],
        sorting: {
          columnId: 'a',
          direction: 'asc',
        },
      });
      // should leave other parts alone
      expect(result.attributes.state.datasourceStates).toEqual(
        example.attributes.state.datasourceStates
      );
      expect(result.attributes.state.query).toEqual(example.attributes.state.query);
      expect(result.attributes.state.filters).toEqual(example.attributes.state.filters);
      expect(result.attributes.title).toEqual(example.attributes.title);
    });
  });

  describe('7.13.0 rename operations for Formula', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '21c145c0-8667-11eb-b6a9-a5bf52bdf519',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: 'lnsXY',
        state: {
          datasourceStates: {
            indexpattern: {
              layers: {
                '5ab74ddc-93ca-44e2-9857-ecf85c86b53e': {
                  columns: {
                    '2e57a41e-5a52-42d3-877f-bd211d903ef8': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0': {
                      label: 'Unique count of agent.keyword',
                      dataType: 'number',
                      operationType: 'cardinality',
                      scale: 'ratio',
                      sourceField: 'agent.keyword',
                      isBucketed: false,
                    },
                    'e5efca70-edb5-4d6d-a30a-79384066987e': {
                      label: 'Average of bytes',
                      dataType: 'number',
                      operationType: 'avg',
                      sourceField: 'bytes',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                    '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f': {
                      label: 'Differences of bytes',
                      dataType: 'number',
                      operationType: 'derivative',
                      isBucketed: false,
                      scale: 'ratio',
                      references: ['9ca33a9b-f2e6-46ef-a5e1-14bfbe262605'],
                    },
                    '9ca33a9b-f2e6-46ef-a5e1-14bfbe262605': {
                      label: 'Average of bytes',
                      dataType: 'number',
                      operationType: 'avg',
                      sourceField: 'bytes',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                  },
                  columnOrder: [
                    '2e57a41e-5a52-42d3-877f-bd211d903ef8',
                    '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
                    'e5efca70-edb5-4d6d-a30a-79384066987e',
                    '9ca33a9b-f2e6-46ef-a5e1-14bfbe262605',
                    '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
                  ],
                  incompleteColumns: {},
                },
              },
            },
          },
          visualization: {
            title: 'Empty XY chart',
            legend: { isVisible: true, position: 'right' },
            valueLabels: 'hide',
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: '5ab74ddc-93ca-44e2-9857-ecf85c86b53e',
                accessors: [
                  '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
                  'e5efca70-edb5-4d6d-a30a-79384066987e',
                  '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
                ],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                xAccessor: '2e57a41e-5a52-42d3-877f-bd211d903ef8',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    };

    const validate = (result: SavedObjectUnsanitizedDoc<LensDocShape<unknown>>) => {
      const layers = result.attributes.state.datasourceStates.indexpattern.layers;
      expect(layers).toEqual({
        '5ab74ddc-93ca-44e2-9857-ecf85c86b53e': {
          columns: {
            '2e57a41e-5a52-42d3-877f-bd211d903ef8': {
              label: '@timestamp',
              dataType: 'date',
              operationType: 'date_histogram',
              sourceField: '@timestamp',
              isBucketed: true,
              scale: 'interval',
              params: { interval: 'auto' },
            },
            '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0': {
              label: 'Unique count of agent.keyword',
              dataType: 'number',
              operationType: 'unique_count',
              scale: 'ratio',
              sourceField: 'agent.keyword',
              isBucketed: false,
            },
            'e5efca70-edb5-4d6d-a30a-79384066987e': {
              label: 'Average of bytes',
              dataType: 'number',
              operationType: 'average',
              sourceField: 'bytes',
              isBucketed: false,
              scale: 'ratio',
            },
            '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f': {
              label: 'Differences of bytes',
              dataType: 'number',
              operationType: 'differences',
              isBucketed: false,
              scale: 'ratio',
              references: ['9ca33a9b-f2e6-46ef-a5e1-14bfbe262605'],
            },
            '9ca33a9b-f2e6-46ef-a5e1-14bfbe262605': {
              label: 'Average of bytes',
              dataType: 'number',
              operationType: 'average',
              sourceField: 'bytes',
              isBucketed: false,
              scale: 'ratio',
            },
          },
          columnOrder: [
            '2e57a41e-5a52-42d3-877f-bd211d903ef8',
            '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
            'e5efca70-edb5-4d6d-a30a-79384066987e',
            '9ca33a9b-f2e6-46ef-a5e1-14bfbe262605',
            '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
          ],
          incompleteColumns: {},
        },
      });
      // should leave other parts alone
      expect(result.attributes.state.visualization).toEqual(example.attributes.state.visualization);
      expect(result.attributes.state.query).toEqual(example.attributes.state.query);
      expect(result.attributes.state.filters).toEqual(example.attributes.state.filters);
      expect(result.attributes.title).toEqual(example.attributes.title);
    };

    it('should rename only specific operation types', () => {
      const result = migrations['7.13.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      validate(result);
    });

    it('can be applied multiple times', () => {
      const result1 = migrations['7.13.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const result2 = migrations['7.13.1'](result1, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      validate(result2);
    });
  });

  describe('7.14.0 remove time zone from date histogram', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: 'lnsXY',
        state: {
          datasourceStates: {
            indexpattern: {
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                    },
                    '4': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '5': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'my_unexpected_operation',
                      isBucketed: true,
                      scale: 'interval',
                      params: { timeZone: 'do not delete' },
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                  incompleteColumns: {},
                },
              },
            },
          },
          visualization: {
            title: 'Empty XY chart',
            legend: { isVisible: true, position: 'right' },
            valueLabels: 'hide',
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: '5ab74ddc-93ca-44e2-9857-ecf85c86b53e',
                accessors: [
                  '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
                  'e5efca70-edb5-4d6d-a30a-79384066987e',
                  '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
                ],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                xAccessor: '2e57a41e-5a52-42d3-877f-bd211d903ef8',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    };

    it('should remove time zone param from date histogram', () => {
      const result = migrations['7.14.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const layers = Object.values(result.attributes.state.datasourceStates.indexpattern.layers);
      expect(layers.length).toBe(1);
      const columns = Object.values(layers[0].columns);
      expect(columns.length).toBe(3);
      expect(columns[0].operationType).toEqual('date_histogram');
      expect((columns[0] as { params: {} }).params).toEqual({ interval: 'auto' });
      expect(columns[1].operationType).toEqual('date_histogram');
      expect((columns[1] as { params: {} }).params).toEqual({ interval: 'auto' });
      expect(columns[2].operationType).toEqual('my_unexpected_operation');
      expect((columns[2] as { params: {} }).params).toEqual({ timeZone: 'do not delete' });
    });
  });

  describe('7.15.0 add layer type information', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: null,
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                    },
                    '4': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '5': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'my_unexpected_operation',
                      isBucketed: true,
                      scale: 'interval',
                      params: { timeZone: 'do not delete' },
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                },
              },
            },
          },
          visualization: {},
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape715<unknown>>;

    it('should add the layerType to a XY visualization', () => {
      const xyExample = cloneDeep(example);
      xyExample.attributes.visualizationType = 'lnsXY';
      (xyExample.attributes as LensDocShape715<VisStatePre715>).state.visualization = {
        title: 'Empty XY chart',
        legend: { isVisible: true, position: 'right' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: '1',
            accessors: [
              '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
              'e5efca70-edb5-4d6d-a30a-79384066987e',
              '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
            ],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            xAccessor: '2e57a41e-5a52-42d3-877f-bd211d903ef8',
          },
          {
            layerId: '2',
            accessors: [
              '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
              'e5efca70-edb5-4d6d-a30a-79384066987e',
              '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
            ],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            xAccessor: '2e57a41e-5a52-42d3-877f-bd211d903ef8',
          },
        ],
      } as unknown as VisStatePre715;
      const result = migrations['7.15.0'](xyExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (result.attributes as LensDocShape715<VisStatePost715>).state.visualization;
      if ('layers' in state) {
        for (const layer of state.layers) {
          expect(layer.layerType).toEqual(layerTypes.DATA);
        }
      }
    });

    it('should add layer info to a pie visualization', () => {
      const pieExample = cloneDeep(example);
      pieExample.attributes.visualizationType = 'lnsPie';
      (pieExample.attributes as LensDocShape715<VisStatePre715>).state.visualization = {
        shape: 'pie',
        layers: [
          {
            layerId: '1',
            groups: [],
            metric: undefined,
            numberDisplay: 'percent',
            categoryDisplay: 'default',
            legendDisplay: 'default',
            nestedLegend: false,
          },
        ],
      } as unknown as VisStatePre715;
      const result = migrations['7.15.0'](pieExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (result.attributes as LensDocShape715<VisStatePost715>).state.visualization;
      if ('layers' in state) {
        for (const layer of state.layers) {
          expect(layer.layerType).toEqual(layerTypes.DATA);
        }
      }
    });
    it('should add layer info to a metric visualization', () => {
      const metricExample = cloneDeep(example);
      metricExample.attributes.visualizationType = 'lnsMetric';
      (metricExample.attributes as LensDocShape715<VisStatePre715>).state.visualization = {
        layerId: '1',
        accessor: undefined,
      } as unknown as VisStatePre715;
      const result = migrations['7.15.0'](metricExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (result.attributes as LensDocShape715<VisStatePost715>).state.visualization;
      expect('layerType' in state).toEqual(true);
      if ('layerType' in state) {
        expect(state.layerType).toEqual(layerTypes.DATA);
      }
    });
    it('should add layer info to a datatable visualization', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsDatatable';
      (datatableExample.attributes as LensDocShape715<VisStatePre715>).state.visualization = {
        layerId: '1',
        accessor: undefined,
      } as unknown as VisStatePre715;
      const result = migrations['7.15.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (result.attributes as LensDocShape715<VisStatePost715>).state.visualization;
      expect('layerType' in state).toEqual(true);
      if ('layerType' in state) {
        expect(state.layerType).toEqual(layerTypes.DATA);
      }
    });
    it('should add layer info to a heatmap visualization', () => {
      const heatmapExample = cloneDeep(example);
      heatmapExample.attributes.visualizationType = 'lnsHeatmap';
      (heatmapExample.attributes as LensDocShape715<VisStatePre715>).state.visualization = {
        layerId: '1',
        accessor: undefined,
      } as unknown as VisStatePre715;
      const result = migrations['7.15.0'](heatmapExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (result.attributes as LensDocShape715<VisStatePost715>).state.visualization;
      expect('layerType' in state).toEqual(true);
      if ('layerType' in state) {
        expect(state.layerType).toEqual(layerTypes.DATA);
      }
    });
  });

  describe('7.16.0 move reversed default palette to custom palette', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: null,
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                    },
                    '4': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '5': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'my_unexpected_operation',
                      isBucketed: true,
                      scale: 'interval',
                      params: { timeZone: 'do not delete' },
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                },
              },
            },
          },
          visualization: {},
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape715<unknown>>;

    it('should just return the same document for XY, partition and metric visualization types', () => {
      for (const vizType of ['lnsXY', 'lnsPie', 'lnsMetric']) {
        const exampleCopy = cloneDeep(example);
        exampleCopy.attributes.visualizationType = vizType;
        // add datatable state here, even with another viz (manual change?)
        (exampleCopy.attributes as LensDocShape715<VisState716>).state.visualization = {
          columns: [
            { palette: { type: 'palette', name: 'temperature' }, colorMode: 'cell' },
            { palette: { type: 'palette', name: 'temperature' }, colorMode: 'text' },
            {
              palette: { type: 'palette', name: 'temperature', params: { reverse: false } },
              colorMode: 'cell',
            },
          ],
        } as unknown as VisState716;
        const result = migrations['7.16.0'](exampleCopy, context) as ReturnType<
          SavedObjectMigrationFn<LensDocShape, LensDocShape>
        >;
        expect(result).toEqual(exampleCopy);
      }
    });

    it('should not change non reversed default palettes in datatable', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsDatatable';
      (datatableExample.attributes as LensDocShape715<VisState716>).state.visualization = {
        columns: [
          { palette: { type: 'palette', name: 'temperature' }, colorMode: 'cell' },
          { palette: { type: 'palette', name: 'temperature' }, colorMode: 'text' },
          {
            palette: { type: 'palette', name: 'temperature', params: { reverse: false } },
            colorMode: 'cell',
          },
        ],
      } as unknown as VisState716;
      const result = migrations['7.16.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      expect(result).toEqual(datatableExample);
    });

    it('should not change custom palettes in datatable', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsDatatable';
      (datatableExample.attributes as LensDocShape715<VisState716>).state.visualization = {
        columns: [
          { palette: { type: 'palette', name: 'custom' }, colorMode: 'cell' },
          { palette: { type: 'palette', name: 'custom' }, colorMode: 'text' },
          {
            palette: { type: 'palette', name: 'custom', params: { reverse: true } },
            colorMode: 'cell',
          },
        ],
      } as unknown as VisState716;
      const result = migrations['7.16.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      expect(result).toEqual(datatableExample);
    });

    it('should not change a datatable with no conditional coloring', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsDatatable';
      (datatableExample.attributes as LensDocShape715<VisState716>).state.visualization = {
        columns: [{ colorMode: 'none' }, {}],
      } as unknown as VisState716;
      const result = migrations['7.16.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      expect(result).toEqual(datatableExample);
    });

    it('should not change default palette if the colorMode is set to "none" in datatable', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsDatatable';
      (datatableExample.attributes as LensDocShape715<VisState716>).state.visualization = {
        columns: [
          { palette: { type: 'palette', name: 'temperature' }, colorMode: 'none' },
          { palette: { type: 'palette', name: 'temperature' }, colorMode: 'none' },
          {
            palette: { type: 'palette', name: 'temperature', params: { reverse: true } },
            colorMode: 'cell',
          },
        ],
      } as unknown as VisState716;
      const result = migrations['7.16.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      expect(result).toEqual(datatableExample);
    });

    it('should change a default palette reversed in datatable', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsDatatable';
      (datatableExample.attributes as LensDocShape715<VisState716>).state.visualization = {
        columns: [
          {
            colorMode: 'cell',
            palette: {
              type: 'palette',
              name: 'temperature1',
              params: {
                reverse: true,
                rangeType: 'number',
                stops: [
                  { color: 'red', stop: 10 },
                  { color: 'blue', stop: 20 },
                  { color: 'pink', stop: 50 },
                  { color: 'green', stop: 60 },
                  { color: 'yellow', stop: 70 },
                ],
              },
            },
          },
          {
            colorMode: 'text',
            palette: {
              type: 'palette',
              name: 'temperature2',
              params: {
                reverse: true,
                rangeType: 'number',
                stops: [
                  { color: 'red', stop: 10 },
                  { color: 'blue', stop: 20 },
                  { color: 'pink', stop: 50 },
                  { color: 'green', stop: 60 },
                  { color: 'yellow', stop: 70 },
                ],
              },
            },
          },
        ],
      } as unknown as VisState716;
      const result = migrations['7.16.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (
        result.attributes as LensDocShape715<Extract<VisState716, { columns: unknown[] }>>
      ).state.visualization;
      for (const column of state.columns) {
        expect(column.palette!.name).toBe('custom');
        expect(column.palette!.params!.name).toBe('custom');
        expect(column.palette!.params!.rangeMin).toBe(0);
        expect(column.palette!.params!.rangeMax).toBe(80);
        expect(column.palette!.params!.reverse).toBeTruthy(); // still true
        expect(column.palette!.params!.rangeType).toBe('percent');
        expect(column.palette!.params!.stops).toEqual([
          { color: 'red', stop: 20 },
          { color: 'blue', stop: 40 },
          { color: 'pink', stop: 60 },
          { color: 'green', stop: 80 },
          { color: 'yellow', stop: 100 },
        ]);
        expect(column.palette!.params!.colorStops).toEqual([
          { color: 'red', stop: 0 },
          { color: 'blue', stop: 20 },
          { color: 'pink', stop: 40 },
          { color: 'green', stop: 60 },
          { color: 'yellow', stop: 80 },
        ]);
      }
    });

    it('should change a default palette reversed in heatmap', () => {
      const datatableExample = cloneDeep(example);
      datatableExample.attributes.visualizationType = 'lnsHeatmap';
      (datatableExample.attributes as LensDocShape715<VisState716>).state.visualization = {
        palette: {
          type: 'palette',
          name: 'temperature1',
          params: {
            reverse: true,
            rangeType: 'number',
            stops: [
              { color: 'red', stop: 10 },
              { color: 'blue', stop: 20 },
              { color: 'pink', stop: 50 },
              { color: 'green', stop: 60 },
              { color: 'yellow', stop: 70 },
            ],
          },
        },
      } as unknown as VisState716;
      const result = migrations['7.16.0'](datatableExample, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const state = (
        result.attributes as LensDocShape715<
          Extract<VisState716, { palette?: PaletteOutput<CustomPaletteParams> }>
        >
      ).state.visualization;
      expect(state.palette!.name).toBe('custom');
      expect(state.palette!.params!.name).toBe('custom');
      expect(state.palette!.params!.rangeMin).toBe(0);
      expect(state.palette!.params!.rangeMax).toBe(80);
      expect(state.palette!.params!.reverse).toBeTruthy(); // still true
      expect(state.palette!.params!.rangeType).toBe('percent');
      expect(state.palette!.params!.stops).toEqual([
        { color: 'red', stop: 20 },
        { color: 'blue', stop: 40 },
        { color: 'pink', stop: 60 },
        { color: 'green', stop: 80 },
        { color: 'yellow', stop: 100 },
      ]);
      expect(state.palette!.params!.colorStops).toEqual([
        { color: 'red', stop: 0 },
        { color: 'blue', stop: 20 },
        { color: 'pink', stop: 40 },
        { color: 'green', stop: 60 },
        { color: 'yellow', stop: 80 },
      ]);
    });
  });

  describe('8.1.0 update filter reference schema', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: null,
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                    },
                    '4': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '5': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'my_unexpected_operation',
                      isBucketed: true,
                      scale: 'interval',
                      params: { timeZone: 'do not delete' },
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                },
              },
            },
          },
          visualization: {},
          query: { query: '', language: 'kuery' },
          filters: [
            {
              meta: {
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'geo.src',
                params: { query: 'US' },
                indexRefName: 'filter-index-pattern-0',
              },
              query: { match_phrase: { 'geo.src': 'US' } },
              $state: { store: 'appState' },
            },
            {
              meta: {
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'client_ip',
                params: { query: '1234.5344.2243.3245' },
                indexRefName: 'filter-index-pattern-2',
              },
              query: { match_phrase: { client_ip: '1234.5344.2243.3245' } },
              $state: { store: 'appState' },
            },
          ],
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape715<VisState716>>;

    it('should rename indexRefName to index in filters metadata', () => {
      const expectedFilters = example.attributes.state.filters.map((filter) => {
        return {
          ...filter,
          meta: {
            ...filter.meta,
            index: filter.meta.indexRefName,
            indexRefName: undefined,
          },
        };
      });

      const result = migrations['8.1.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;

      expect(result.attributes.state.filters).toEqual(expectedFilters);
    });
  });

  describe('8.1.0 rename records field', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: null,
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                    },
                    '4': {
                      label: 'Anzahl der Aufnahmen',
                      dataType: 'number',
                      operationType: 'count',
                      sourceField: 'Aufnahmen',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                    '5': {
                      label: 'Sum of bytes',
                      dataType: 'numver',
                      operationType: 'sum',
                      sourceField: 'bytes',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                },
              },
            },
          },
          visualization: {},
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;

    it('should change field for count operations but not for others, not changing the vis', () => {
      const result = migrations['8.1.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;

      expect(
        Object.values(
          result.attributes.state.datasourceStates.indexpattern.layers['2'].columns
        ).map((column) => column.sourceField)
      ).toEqual(['@timestamp', '___records___', 'bytes']);
      expect(example.attributes.state.visualization).toEqual(result.attributes.state.visualization);
    });
  });

  test('should properly apply a filter migration within a lens visualization', () => {
    const migrationVersion = 'some-version';

    const lensVisualizationDoc = {
      attributes: {
        state: {
          filters: [
            {
              filter: 1,
              migrated: false,
            },
            {
              filter: 2,
              migrated: false,
            },
          ],
        },
      },
    };

    const migrationFunctionsObject = getAllMigrations(
      {
        [migrationVersion]: (filters: Filter[]) => {
          return filters.map((filterState) => ({
            ...filterState,
            migrated: true,
          }));
        },
      },
      {}
    );

    const migratedLensDoc = migrationFunctionsObject[migrationVersion](
      lensVisualizationDoc as SavedObjectUnsanitizedDoc,
      {} as SavedObjectMigrationContext
    );

    expect(migratedLensDoc).toEqual({
      attributes: {
        state: {
          filters: [
            {
              filter: 1,
              migrated: true,
            },
            {
              filter: 2,
              migrated: true,
            },
          ],
        },
      },
    });
  });

  test('should properly apply a custom visualization migration', () => {
    const migrationVersion = 'some-version';

    const lensVisualizationDoc = {
      attributes: {
        visualizationType: 'abc',
        state: {
          visualization: { oldState: true },
        },
      },
    };

    const migrationFn = jest.fn((oldState: { oldState: boolean }) => ({
      newState: oldState.oldState,
    }));

    const migrationFunctionsObject = getAllMigrations(
      {},
      {
        abc: () => ({
          [migrationVersion]: migrationFn,
        }),
      }
    );
    const migratedLensDoc = migrationFunctionsObject[migrationVersion](
      lensVisualizationDoc as SavedObjectUnsanitizedDoc,
      {} as SavedObjectMigrationContext
    );
    const otherLensDoc = migrationFunctionsObject[migrationVersion](
      {
        ...lensVisualizationDoc,
        attributes: {
          ...lensVisualizationDoc.attributes,
          visualizationType: 'def',
        },
      } as SavedObjectUnsanitizedDoc,
      {} as SavedObjectMigrationContext
    );

    expect(migrationFn).toHaveBeenCalledTimes(1);

    expect(migratedLensDoc).toEqual({
      attributes: {
        visualizationType: 'abc',
        state: {
          visualization: { newState: true },
        },
      },
    });
    expect(otherLensDoc).toEqual({
      attributes: {
        visualizationType: 'def',
        state: {
          visualization: { oldState: true },
        },
      },
    });
  });

  describe('8.1.0 add parentFormat to terms operation', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: null,
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                '2': {
                  columns: {
                    '3': {
                      dataType: 'string',
                      isBucketed: true,
                      label: 'Top values of geoip.country_iso_code',
                      operationType: 'terms',
                      params: {},
                      scale: 'ordinal',
                      sourceField: 'geoip.country_iso_code',
                    },
                    '4': {
                      label: 'Anzahl der Aufnahmen',
                      dataType: 'number',
                      operationType: 'count',
                      sourceField: 'Aufnahmen',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                    '5': {
                      label: 'Sum of bytes',
                      dataType: 'numver',
                      operationType: 'sum',
                      sourceField: 'bytes',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                },
              },
            },
          },
          visualization: {},
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;

    it('should change field for count operations but not for others, not changing the vis', () => {
      const result = migrations['8.1.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;

      expect(
        Object.values(
          result.attributes.state.datasourceStates.indexpattern.layers['2'].columns
        ).find(({ operationType }) => operationType === 'terms')
      ).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({ parentFormat: { id: 'terms' } }),
        })
      );
    });
  });

  describe('8.2.0', () => {
    describe('last_value columns', () => {
      const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
      const example = {
        type: 'lens',
        id: 'mocked-saved-object-id',
        attributes: {
          savedObjectId: '1',
          title: 'MyRenamedOps',
          description: '',
          visualizationType: null,
          state: {
            datasourceMetaData: {
              filterableIndexPatterns: [],
            },
            datasourceStates: {
              indexpattern: {
                currentIndexPatternId: 'logstash-*',
                layers: {
                  '2': {
                    columns: {
                      '3': {
                        dataType: 'string',
                        isBucketed: true,
                        label: 'Top values of geoip.country_iso_code',
                        operationType: 'terms',
                        params: {},
                        scale: 'ordinal',
                        sourceField: 'geoip.country_iso_code',
                      },
                      '4': {
                        label: 'Anzahl der Aufnahmen',
                        dataType: 'number',
                        operationType: 'count',
                        sourceField: 'Aufnahmen',
                        isBucketed: false,
                        scale: 'ratio',
                      },
                      '5': {
                        label: 'Sum of bytes',
                        dataType: 'numver',
                        operationType: 'last_value',
                        params: {
                          // no showArrayValues
                        },
                        sourceField: 'bytes',
                        isBucketed: false,
                        scale: 'ratio',
                      },
                    },
                    columnOrder: ['3', '4', '5'],
                  },
                  '3': {
                    columns: {
                      '5': {
                        label: 'Sum of bytes',
                        dataType: 'numver',
                        operationType: 'last_value',
                        params: {
                          // no showArrayValues
                        },
                        sourceField: 'bytes',
                        isBucketed: false,
                        scale: 'ratio',
                      },
                    },
                    columnOrder: ['3', '4', '5'],
                  },
                },
              },
            },
            visualization: {},
            query: { query: '', language: 'kuery' },
            filters: [],
          },
        },
      } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;

      it('should set showArrayValues for last-value columns', () => {
        const result = migrations['8.2.0'](example, context) as ReturnType<
          SavedObjectMigrationFn<LensDocShape, LensDocShape>
        >;

        const layer2Columns =
          result.attributes.state.datasourceStates.indexpattern.layers['2'].columns;
        const layer3Columns =
          result.attributes.state.datasourceStates.indexpattern.layers['3'].columns;
        expect(layer2Columns['5'].params).toHaveProperty('showArrayValues', true);
        expect(layer2Columns['3'].params).not.toHaveProperty('showArrayValues');
        expect(layer3Columns['5'].params).toHaveProperty('showArrayValues', true);
      });
    });

    describe('rename fitRowToContent to new detailed rowHeight and rowHeightLines', () => {
      const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
      function getExample(fitToContent: boolean) {
        return {
          type: 'lens',
          id: 'mocked-saved-object-id',
          attributes: {
            visualizationType: 'lnsDatatable',
            title: 'Lens visualization',
            references: [
              {
                id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                name: 'indexpattern-datasource-current-indexpattern',
                type: 'index-pattern',
              },
              {
                id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                name: 'indexpattern-datasource-layer-cddd8f79-fb20-4191-a3e7-92484780cc62',
                type: 'index-pattern',
              },
            ],
            state: {
              datasourceStates: {
                indexpattern: {
                  layers: {
                    'cddd8f79-fb20-4191-a3e7-92484780cc62': {
                      indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                      columns: {
                        '221f0abf-6e54-4c61-9316-4107ad6fa500': {
                          label: 'Top values of category.keyword',
                          dataType: 'string',
                          operationType: 'terms',
                          scale: 'ordinal',
                          sourceField: 'category.keyword',
                          isBucketed: true,
                          params: {
                            size: 5,
                            orderBy: {
                              type: 'column',
                              columnId: 'c6f07a26-64eb-4871-ad62-c7d937230e33',
                            },
                            orderDirection: 'desc',
                            otherBucket: true,
                            missingBucket: false,
                            parentFormat: {
                              id: 'terms',
                            },
                          },
                        },
                        'c6f07a26-64eb-4871-ad62-c7d937230e33': {
                          label: 'Count of records',
                          dataType: 'number',
                          operationType: 'count',
                          isBucketed: false,
                          scale: 'ratio',
                          sourceField: '___records___',
                        },
                      },
                      columnOrder: [
                        '221f0abf-6e54-4c61-9316-4107ad6fa500',
                        'c6f07a26-64eb-4871-ad62-c7d937230e33',
                      ],
                      incompleteColumns: {},
                    },
                  },
                },
              },
              visualization: {
                columns: [
                  {
                    isTransposed: false,
                    columnId: '221f0abf-6e54-4c61-9316-4107ad6fa500',
                  },
                  {
                    isTransposed: false,
                    columnId: 'c6f07a26-64eb-4871-ad62-c7d937230e33',
                  },
                ],
                layerId: 'cddd8f79-fb20-4191-a3e7-92484780cc62',
                layerType: 'data',
                fitRowToContent: fitToContent,
              },
              filters: [],
              query: {
                query: '',
                language: 'kuery',
              },
            },
          },
        } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;
      }

      it('should migrate enabled fitRowToContent to new rowHeight: "auto"', () => {
        const result = migrations['8.2.0'](getExample(true), context) as ReturnType<
          SavedObjectMigrationFn<LensDocShape810<VisState810>, LensDocShape810<VisState820>>
        >;

        expect(result.attributes.state.visualization as VisState820).toEqual(
          expect.objectContaining({
            rowHeight: 'auto',
          })
        );
      });

      it('should migrate disabled fitRowToContent to new rowHeight: "single"', () => {
        const result = migrations['8.2.0'](getExample(false), context) as ReturnType<
          SavedObjectMigrationFn<LensDocShape810<VisState810>, LensDocShape810<VisState820>>
        >;

        expect(result.attributes.state.visualization as VisState820).toEqual(
          expect.objectContaining({
            rowHeight: 'single',
            rowHeightLines: 1,
          })
        );
      });
    });
  });

  describe('8.2.0 include empty rows for date histogram columns', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: null,
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                    },
                    '4': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '6': {
                      label: 'Sum of bytes',
                      dataType: 'number',
                      operationType: 'sum',
                      sourceField: 'bytes',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                },
              },
            },
          },
          visualization: {},
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;

    it('should set include empty rows for all date histogram columns', () => {
      const result = migrations['8.2.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;

      const layer2Columns =
        result.attributes.state.datasourceStates.indexpattern.layers['2'].columns;
      expect(layer2Columns['3'].params).toHaveProperty('includeEmptyRows', true);
      expect(layer2Columns['4'].params).toHaveProperty('includeEmptyRows', true);
    });
  });
  describe('8.3.0 old metric visualization defaults', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: 'lnsMetric',
        state: {
          visualization: {},
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;

    it('preserves current config for existing visualizations that are using the DEFAULTS', () => {
      const result = migrations['8.3.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const visState = result.attributes.state.visualization as MetricState;
      expect(visState.textAlign).toBe('center');
      expect(visState.titlePosition).toBe('bottom');
      expect(visState.size).toBe('xl');
    });

    it('preserves current config for existing visualizations that are using CUSTOM settings', () => {
      const result = migrations['8.3.0'](
        {
          ...example,
          attributes: {
            ...example.attributes,
            state: {
              visualization: {
                textAlign: 'right',
                titlePosition: 'top',
                size: 's',
              },
            },
          },
        },
        context
      ) as ReturnType<SavedObjectMigrationFn<LensDocShape, LensDocShape>>;
      const visState = result.attributes.state.visualization as MetricState;
      expect(visState.textAlign).toBe('right');
      expect(visState.titlePosition).toBe('top');
      expect(visState.size).toBe('s');
    });
  });

  describe('8.3.0 valueLabels in XY', () => {
    const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;
    const example = {
      type: 'lens',
      id: 'mocked-saved-object-id',
      attributes: {
        savedObjectId: '1',
        title: 'MyRenamedOps',
        description: '',
        visualizationType: 'lnsXY',
        state: {
          visualization: {
            valueLabels: 'inside',
          },
        },
      },
    } as unknown as SavedObjectUnsanitizedDoc<LensDocShape810>;

    it('migrates valueLabels from `inside` to `show`', () => {
      const result = migrations['8.3.0'](example, context) as ReturnType<
        SavedObjectMigrationFn<LensDocShape, LensDocShape>
      >;
      const visState = result.attributes.state.visualization as VisState830;
      expect(visState.valueLabels).toBe('show');
    });

    it("doesn't migrate valueLabels with `hide` value", () => {
      const result = migrations['8.3.0'](
        {
          ...example,
          attributes: {
            ...example.attributes,
            state: {
              ...example.attributes.state,
              visualization: {
                ...(example.attributes.state.visualization as Record<string, unknown>),
                valueLabels: 'hide',
              },
            },
          },
        },
        context
      ) as ReturnType<SavedObjectMigrationFn<LensDocShape, LensDocShape>>;
      const visState = result.attributes.state.visualization as VisState830;
      expect(visState.valueLabels).toBe('hide');
    });
  });
});

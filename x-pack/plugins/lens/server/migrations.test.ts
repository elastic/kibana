/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { migrations } from './migrations';
import { SavedObjectMigrationContext } from 'src/core/server';

describe('Lens migrations', () => {
  describe('7.7.0 missing dimensions in XY', () => {
    const context = {} as SavedObjectMigrationContext;

    const example = {
      type: 'lens',
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
    const context = ({ log: { warning: () => {} } } as unknown) as SavedObjectMigrationContext;

    const example = {
      type: 'lens',
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
  | lens_xy_chart
      xTitle="products.created_on"
      yTitle="Count of records"
      legend={lens_xy_legendConfig isVisible=true position="right"} 
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
        attributes: {
          ...example.attributes,
          expression: `kibana
| kibana_context query="{\\"query\\":\\"\\",\\"language\\":\\"kuery\\"}" filters="[]"
| lens_merge_tables layerIds="bd09dc71-a7e2-42d0-83bd-85df8291f03c" 
  tables={esaggs index="ff959d40-b880-11e8-a6d9-e546fe2bba5f" metricsAtAllLevels=false partialRows=false includeFormatHints=true aggConfigs="[{\\"id\\":\\"1d9cc16c-1460-41de-88f8-471932ecbc97\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"products.created_on\\",\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"auto\\",\\"drop_partials\\":false,\\"min_doc_count\\":0,\\"extended_bounds\\":{}}},{\\"id\\":\\"66115819-8481-4917-a6dc-8ffb10dd02df\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]" timeFields=\"products.created_on\"}
| lens_xy_chart xTitle="products.created_on" yTitle="Count of records" legend={lens_xy_legendConfig isVisible=true position="right"} layers={}`,
        },
      };
      const result = migrations['7.8.0'](input, context);
      expect(result).toEqual(input);
    });
  });

  describe('7.10.0 references', () => {
    const context = {} as SavedObjectMigrationContext;

    const example = {
      attributes: {
        description: '',
        expression:
          'kibana\n| kibana_context  query="{\\"query\\":\\"NOT bytes > 5000\\",\\"language\\":\\"kuery\\"}" \n  filters="[{\\"meta\\":{\\"index\\":\\"90943e30-9a47-11e8-b64d-95841ca0b247\\",\\"alias\\":null,\\"negate\\":true,\\"disabled\\":false,\\"type\\":\\"phrase\\",\\"key\\":\\"geo.src\\",\\"params\\":{\\"query\\":\\"CN\\"}},\\"query\\":{\\"match_phrase\\":{\\"geo.src\\":\\"CN\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}},{\\"meta\\":{\\"index\\":\\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\\",\\"alias\\":null,\\"negate\\":true,\\"disabled\\":false,\\"type\\":\\"phrase\\",\\"key\\":\\"geoip.country_iso_code\\",\\"params\\":{\\"query\\":\\"US\\"}},\\"query\\":{\\"match_phrase\\":{\\"geoip.country_iso_code\\":\\"US\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}}]"\n| lens_merge_tables layerIds="9a27f85d-35a9-4246-81b2-48e7ee9b0707"\n  layerIds="3b7791e9-326e-40d5-a787-b7594e48d906" \n  tables={esaggs index="90943e30-9a47-11e8-b64d-95841ca0b247" metricsAtAllLevels=true partialRows=true includeFormatHints=true  aggConfigs="[{\\"id\\":\\"96352896-c508-4fca-90d8-66e9ebfce621\\",\\"enabled\\":true,\\"type\\":\\"terms\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"geo.src\\",\\"orderBy\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\",\\"order\\":\\"desc\\",\\"size\\":5,\\"otherBucket\\":false,\\"otherBucketLabel\\":\\"Other\\",\\"missingBucket\\":false,\\"missingBucketLabel\\":\\"Missing\\"}},{\\"id\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]" | lens_rename_columns idMap="{\\"col-0-96352896-c508-4fca-90d8-66e9ebfce621\\":{\\"label\\":\\"Top values of geo.src\\",\\"dataType\\":\\"string\\",\\"operationType\\":\\"terms\\",\\"scale\\":\\"ordinal\\",\\"sourceField\\":\\"geo.src\\",\\"isBucketed\\":true,\\"params\\":{\\"size\\":5,\\"orderBy\\":{\\"type\\":\\"column\\",\\"columnId\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\"},\\"orderDirection\\":\\"desc\\"},\\"id\\":\\"96352896-c508-4fca-90d8-66e9ebfce621\\"},\\"col-1-4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"operationType\\":\\"count\\",\\"isBucketed\\":false,\\"scale\\":\\"ratio\\",\\"sourceField\\":\\"Records\\",\\"id\\":\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\"}}"}\n  tables={esaggs index="ff959d40-b880-11e8-a6d9-e546fe2bba5f" metricsAtAllLevels=true partialRows=true includeFormatHints=true  aggConfigs="[{\\"id\\":\\"77d8383e-f66e-471e-ae50-c427feedb5ba\\",\\"enabled\\":true,\\"type\\":\\"terms\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"geoip.country_iso_code\\",\\"orderBy\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\",\\"order\\":\\"desc\\",\\"size\\":5,\\"otherBucket\\":false,\\"otherBucketLabel\\":\\"Other\\",\\"missingBucket\\":false,\\"missingBucketLabel\\":\\"Missing\\"}},{\\"id\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}}]" | lens_rename_columns idMap="{\\"col-0-77d8383e-f66e-471e-ae50-c427feedb5ba\\":{\\"label\\":\\"Top values of geoip.country_iso_code\\",\\"dataType\\":\\"string\\",\\"operationType\\":\\"terms\\",\\"scale\\":\\"ordinal\\",\\"sourceField\\":\\"geoip.country_iso_code\\",\\"isBucketed\\":true,\\"params\\":{\\"size\\":5,\\"orderBy\\":{\\"type\\":\\"column\\",\\"columnId\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\"},\\"orderDirection\\":\\"desc\\"},\\"id\\":\\"77d8383e-f66e-471e-ae50-c427feedb5ba\\"},\\"col-1-a5c1b82d-51de-4448-a99d-6391432c3a03\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"operationType\\":\\"count\\",\\"isBucketed\\":false,\\"scale\\":\\"ratio\\",\\"sourceField\\":\\"Records\\",\\"id\\":\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\"}}"}\n| lens_xy_chart xTitle="Top values of geo.src" yTitle="Count of records" legend={lens_xy_legendConfig isVisible=true position="right"} fittingFunction="None" \n  layers={lens_xy_layer layerId="9a27f85d-35a9-4246-81b2-48e7ee9b0707" hide=false xAccessor="96352896-c508-4fca-90d8-66e9ebfce621" yScaleType="linear" xScaleType="ordinal" isHistogram=false   seriesType="bar" accessors="4ce9b4c7-2ebf-4d48-8669-0ea69d973353" columnToLabel="{\\"4ce9b4c7-2ebf-4d48-8669-0ea69d973353\\":\\"Count of records\\"}"}\n  layers={lens_xy_layer layerId="3b7791e9-326e-40d5-a787-b7594e48d906" hide=false xAccessor="77d8383e-f66e-471e-ae50-c427feedb5ba" yScaleType="linear" xScaleType="ordinal" isHistogram=false   seriesType="bar" accessors="a5c1b82d-51de-4448-a99d-6391432c3a03" columnToLabel="{\\"a5c1b82d-51de-4448-a99d-6391432c3a03\\":\\"Count of records [1]\\"}"}',
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
});

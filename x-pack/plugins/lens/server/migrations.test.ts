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
});

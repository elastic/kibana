/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter/common';
import { buildExpression } from '../../../../../src/plugins/expressions/public';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import { DatatableVisualizationState, getDatatableVisualization } from './visualization';
import {
  Operation,
  DataType,
  FramePublicAPI,
  TableSuggestionColumn,
  VisualizationDimensionGroupConfig,
} from '../types';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { layerTypes } from '../../common';

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    datasourceLayers: {},
  };
}

const datatableVisualization = getDatatableVisualization({
  paletteService: chartPluginMock.createPaletteRegistry(),
});

describe('Datatable Visualization', () => {
  describe('#initialize', () => {
    it('should initialize from the empty state', () => {
      expect(datatableVisualization.initialize(() => 'aaa', undefined)).toEqual({
        layerId: 'aaa',
        layerType: layerTypes.DATA,
        columns: [],
      });
    });

    it('should initialize from a persisted state', () => {
      const expectedState: DatatableVisualizationState = {
        layerId: 'foo',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'saved' }],
      };
      expect(datatableVisualization.initialize(() => 'foo', expectedState)).toEqual(expectedState);
    });
  });

  describe('#getLayerIds', () => {
    it('return the layer ids', () => {
      const state: DatatableVisualizationState = {
        layerId: 'baz',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'a' }, { columnId: 'b' }, { columnId: 'c' }],
      };
      expect(datatableVisualization.getLayerIds(state)).toEqual(['baz']);
    });
  });

  describe('#clearLayer', () => {
    it('should reset the layer', () => {
      const state: DatatableVisualizationState = {
        layerId: 'baz',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'a' }, { columnId: 'b' }, { columnId: 'c' }],
      };
      expect(datatableVisualization.clearLayer(state, 'baz')).toMatchObject({
        layerId: 'baz',
        layerType: layerTypes.DATA,
        columns: [],
      });
    });
  });

  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(datatableVisualization.getSupportedLayers()).toHaveLength(1);
    });
  });

  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      const state: DatatableVisualizationState = {
        layerId: 'baz',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'a' }, { columnId: 'b' }, { columnId: 'c' }],
      };
      expect(datatableVisualization.getLayerType('baz', state)).toEqual(layerTypes.DATA);
      expect(datatableVisualization.getLayerType('foo', state)).toBeUndefined();
    });
  });

  describe('#getSuggestions', () => {
    function numCol(columnId: string): TableSuggestionColumn {
      return {
        columnId,
        operation: {
          dataType: 'number',
          label: `Avg ${columnId}`,
          isBucketed: false,
        },
      };
    }

    function strCol(columnId: string): TableSuggestionColumn {
      return {
        columnId,
        operation: {
          dataType: 'string',
          label: `Top 5 ${columnId}`,
          isBucketed: true,
        },
      };
    }

    it('should accept a single-layer suggestion', () => {
      const suggestions = datatableVisualization.getSuggestions({
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          columns: [{ columnId: 'col1' }],
        },
        table: {
          isMultiRow: true,
          layerId: 'first',
          changeType: 'initial',
          columns: [numCol('col1'), strCol('col2')],
        },
        keptLayerIds: [],
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should retain width and hidden config from existing state', () => {
      const suggestions = datatableVisualization.getSuggestions({
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          columns: [
            { columnId: 'col1', width: 123 },
            { columnId: 'col2', hidden: true },
          ],
          sorting: {
            columnId: 'col1',
            direction: 'asc',
          },
        },
        table: {
          isMultiRow: true,
          layerId: 'first',
          changeType: 'initial',
          columns: [numCol('col1'), strCol('col2'), strCol('col3')],
        },
        keptLayerIds: [],
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].state.columns).toEqual([
        { columnId: 'col1', width: 123, isTransposed: false },
        { columnId: 'col2', hidden: true, isTransposed: false },
        { columnId: 'col3', isTransposed: false },
      ]);
      expect(suggestions[0].state.sorting).toEqual({
        columnId: 'col1',
        direction: 'asc',
      });
    });

    it('should not make suggestions when the table is unchanged', () => {
      const suggestions = datatableVisualization.getSuggestions({
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          columns: [{ columnId: 'col1' }],
        },
        table: {
          isMultiRow: true,
          layerId: 'first',
          changeType: 'unchanged',
          columns: [numCol('col1')],
        },
        keptLayerIds: ['first'],
      });

      expect(suggestions).toEqual([]);
    });

    it('should not make suggestions when multiple layers are involved', () => {
      const suggestions = datatableVisualization.getSuggestions({
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          columns: [{ columnId: 'col1' }],
        },
        table: {
          isMultiRow: true,
          layerId: 'first',
          changeType: 'unchanged',
          columns: [numCol('col1')],
        },
        keptLayerIds: ['first', 'second'],
      });

      expect(suggestions).toEqual([]);
    });

    it('should not make suggestions when the suggestion keeps a different layer', () => {
      const suggestions = datatableVisualization.getSuggestions({
        state: {
          layerId: 'older',
          layerType: layerTypes.DATA,
          columns: [{ columnId: 'col1' }],
        },
        table: {
          isMultiRow: true,
          layerId: 'newer',
          changeType: 'initial',
          columns: [numCol('col1'), strCol('col2')],
        },
        keptLayerIds: ['older'],
      });

      expect(suggestions).toEqual([]);
    });

    it('should suggest unchanged tables when the state is not passed in', () => {
      const suggestions = datatableVisualization.getSuggestions({
        table: {
          isMultiRow: true,
          layerId: 'first',
          changeType: 'unchanged',
          columns: [numCol('col1')],
        },
        keptLayerIds: ['first'],
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('#getConfiguration', () => {
    it('returns a single layer option', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { first: datasource.publicAPIMock };

      expect(
        datatableVisualization.getConfiguration({
          layerId: 'first',
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
            columns: [],
          },
          frame,
        }).groups
      ).toHaveLength(3);
    });

    it('allows only bucket operations for splitting columns and rows', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { first: datasource.publicAPIMock };
      const groups = datatableVisualization.getConfiguration({
        layerId: 'first',
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          columns: [],
        },
        frame,
      }).groups;

      function testGroup(group: VisualizationDimensionGroupConfig) {
        const baseOperation: Operation = {
          dataType: 'string',
          isBucketed: true,
          label: '',
        };
        expect(group.filterOperations({ ...baseOperation })).toEqual(true);
        expect(group.filterOperations({ ...baseOperation, dataType: 'number' })).toEqual(true);
        expect(group.filterOperations({ ...baseOperation, dataType: 'date' })).toEqual(true);
        expect(group.filterOperations({ ...baseOperation, dataType: 'boolean' })).toEqual(true);
        expect(group.filterOperations({ ...baseOperation, dataType: 'other' as DataType })).toEqual(
          true
        );
        expect(
          group.filterOperations({ ...baseOperation, dataType: 'date', isBucketed: false })
        ).toEqual(false);
        expect(
          group.filterOperations({ ...baseOperation, dataType: 'number', isBucketed: false })
        ).toEqual(false);
      }

      testGroup(groups[0]);
      testGroup(groups[1]);
    });

    it('allows only metric operations in one category', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { first: datasource.publicAPIMock };

      const filterOperations = datatableVisualization.getConfiguration({
        layerId: 'first',
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          columns: [],
        },
        frame,
      }).groups[2].filterOperations;

      const baseOperation: Operation = {
        dataType: 'string',
        isBucketed: true,
        label: '',
      };
      expect(filterOperations({ ...baseOperation })).toEqual(false);
      expect(filterOperations({ ...baseOperation, dataType: 'number' })).toEqual(false);
      expect(filterOperations({ ...baseOperation, dataType: 'date' })).toEqual(false);
      expect(filterOperations({ ...baseOperation, dataType: 'boolean' })).toEqual(false);
      expect(filterOperations({ ...baseOperation, dataType: 'other' as DataType })).toEqual(false);
      expect(filterOperations({ ...baseOperation, dataType: 'date', isBucketed: false })).toEqual(
        true
      );
      expect(filterOperations({ ...baseOperation, dataType: 'number', isBucketed: false })).toEqual(
        true
      );
    });

    it('reorders the rendered colums based on the order from the datasource', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      datasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'c' }, { columnId: 'b' }]);

      expect(
        datatableVisualization.getConfiguration({
          layerId: 'a',
          state: {
            layerId: 'a',
            layerType: layerTypes.DATA,
            columns: [{ columnId: 'b' }, { columnId: 'c' }],
          },
          frame,
        }).groups[2].accessors
      ).toEqual([{ columnId: 'c' }, { columnId: 'b' }]);
    });
  });

  describe('#removeDimension', () => {
    it('allows columns to be removed', () => {
      expect(
        datatableVisualization.removeDimension({
          prevState: {
            layerId: 'layer1',
            layerType: layerTypes.DATA,
            columns: [{ columnId: 'b' }, { columnId: 'c' }],
          },
          layerId: 'layer1',
          columnId: 'b',
          frame: mockFrame(),
        })
      ).toEqual({
        layerId: 'layer1',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'c' }],
      });
    });

    it('should handle correctly the sorting state on removing dimension', () => {
      const state = {
        layerId: 'layer1',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'b' }, { columnId: 'c' }],
      };
      expect(
        datatableVisualization.removeDimension({
          prevState: { ...state, sorting: { columnId: 'b', direction: 'asc' } },
          layerId: 'layer1',
          columnId: 'b',
          frame: mockFrame(),
        })
      ).toEqual({
        sorting: undefined,
        layerId: 'layer1',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'c' }],
      });

      expect(
        datatableVisualization.removeDimension({
          prevState: { ...state, sorting: { columnId: 'c', direction: 'asc' } },
          layerId: 'layer1',
          columnId: 'b',
          frame: mockFrame(),
        })
      ).toEqual({
        sorting: { columnId: 'c', direction: 'asc' },
        layerId: 'layer1',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'c' }],
      });
    });
  });

  describe('#setDimension', () => {
    it('allows columns to be added', () => {
      expect(
        datatableVisualization.setDimension({
          prevState: {
            layerId: 'layer1',
            layerType: layerTypes.DATA,
            columns: [{ columnId: 'b' }, { columnId: 'c' }],
          },
          layerId: 'layer1',
          columnId: 'd',
          groupId: '',
          frame: mockFrame(),
        })
      ).toEqual({
        layerId: 'layer1',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'b' }, { columnId: 'c' }, { columnId: 'd', isTransposed: false }],
      });
    });

    it('does not set a duplicate dimension', () => {
      expect(
        datatableVisualization.setDimension({
          prevState: {
            layerId: 'layer1',
            layerType: layerTypes.DATA,
            columns: [{ columnId: 'b' }, { columnId: 'c' }],
          },
          layerId: 'layer1',
          columnId: 'b',
          groupId: '',
          frame: mockFrame(),
        })
      ).toEqual({
        layerId: 'layer1',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'b', isTransposed: false }, { columnId: 'c' }],
      });
    });
  });

  describe('#toExpression', () => {
    it('reorders the rendered colums based on the order from the datasource', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      datasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'c' }, { columnId: 'b' }]);
      datasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        isBucketed: false, // <= make them metrics
        label: 'label',
      });

      const expression = datatableVisualization.toExpression(
        {
          layerId: 'a',
          layerType: layerTypes.DATA,
          columns: [{ columnId: 'b' }, { columnId: 'c' }],
        },
        frame.datasourceLayers
      ) as Ast;

      const tableArgs = buildExpression(expression).findFunction('lens_datatable');

      expect(tableArgs).toHaveLength(1);
      expect(tableArgs[0].arguments).toEqual(
        expect.objectContaining({
          sortingColumnId: [''],
          sortingDirection: ['none'],
        })
      );
      const columnArgs = buildExpression(expression).findFunction('lens_datatable_column');
      expect(columnArgs).toHaveLength(2);
      expect(columnArgs[0].arguments).toEqual(
        expect.objectContaining({
          columnId: ['c'],
          hidden: [],
          width: [],
          isTransposed: [],
          transposable: [true],
          alignment: [],
          colorMode: ['none'],
        })
      );
      expect(columnArgs[1].arguments).toEqual(
        expect.objectContaining({
          columnId: ['b'],
          hidden: [],
          width: [],
          isTransposed: [],
          transposable: [true],
          alignment: [],
          colorMode: ['none'],
        })
      );
    });

    it('returns no expression if the metric dimension is not defined', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      datasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'c' }, { columnId: 'b' }]);
      datasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        isBucketed: true, // move it from the metric to the break down by side
        label: 'label',
      });

      const expression = datatableVisualization.toExpression(
        {
          layerId: 'a',
          layerType: layerTypes.DATA,
          columns: [{ columnId: 'b' }, { columnId: 'c' }],
        },
        frame.datasourceLayers
      );

      expect(expression).toEqual(null);
    });
  });

  describe('#getErrorMessages', () => {
    it('returns undefined if the datasource is missing a metric dimension', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      datasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'c' }, { columnId: 'b' }]);
      datasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        isBucketed: true, // move it from the metric to the break down by side
        label: 'label',
      });

      const error = datatableVisualization.getErrorMessages({
        layerId: 'a',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'b' }, { columnId: 'c' }],
      });

      expect(error).toBeUndefined();
    });

    it('returns undefined if the metric dimension is defined', () => {
      const datasource = createMockDatasource('test');
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      datasource.publicAPIMock.getTableSpec.mockReturnValue([{ columnId: 'c' }, { columnId: 'b' }]);
      datasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        isBucketed: false, // keep it a metric
        label: 'label',
      });

      const error = datatableVisualization.getErrorMessages({
        layerId: 'a',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'b' }, { columnId: 'c' }],
      });

      expect(error).toBeUndefined();
    });
  });

  describe('#onEditAction', () => {
    it('should add a sort column to the state', () => {
      const currentState: DatatableVisualizationState = {
        layerId: 'foo',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'saved' }],
      };
      expect(
        datatableVisualization.onEditAction!(currentState, {
          name: 'edit',
          data: { action: 'sort', columnId: 'saved', direction: 'none' },
        })
      ).toEqual({
        ...currentState,
        sorting: {
          columnId: 'saved',
          direction: 'none',
        },
      });
    });

    it('should add a custom width to a column in the state', () => {
      const currentState: DatatableVisualizationState = {
        layerId: 'foo',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'saved' }],
      };
      expect(
        datatableVisualization.onEditAction!(currentState, {
          name: 'edit',
          data: { action: 'resize', columnId: 'saved', width: 500 },
        })
      ).toEqual({
        ...currentState,
        columns: [{ columnId: 'saved', width: 500 }],
      });
    });

    it('should clear custom width value for the column from the state', () => {
      const currentState: DatatableVisualizationState = {
        layerId: 'foo',
        layerType: layerTypes.DATA,
        columns: [{ columnId: 'saved', width: 5000 }],
      };
      expect(
        datatableVisualization.onEditAction!(currentState, {
          name: 'edit',
          data: { action: 'resize', columnId: 'saved', width: undefined },
        })
      ).toEqual({
        ...currentState,
        columns: [{ columnId: 'saved', width: undefined }],
      });
    });
  });
});

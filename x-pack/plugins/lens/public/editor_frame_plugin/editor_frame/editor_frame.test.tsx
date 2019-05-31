/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { EditorFrame } from './editor_frame';
import { Visualization, Datasource, DatasourcePublicAPI, DatasourceSuggestion } from '../../types';
import { act } from 'react-dom/test-utils';
import { createMockVisualization, createMockDatasource } from '../mock_extensions';

// calling this function will wait for all pending Promises from mock
// datasources to be processed by its callers.
const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

function generateSuggestion(datasourceSuggestionId = 1, state = {}): DatasourceSuggestion {
  return {
    state: {},
    table: {
      columns: [],
      datasourceSuggestionId: 1,
      isMultiRow: true,
    },
  };
}

describe('editor_frame', () => {
  let mockVisualization: Visualization;
  let mockDatasource: Datasource;

  let mockVisualization2: Visualization;
  let mockDatasource2: Datasource;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockVisualization2 = createMockVisualization();

    mockDatasource = createMockDatasource();
    mockDatasource2 = createMockDatasource();
  });

  describe('initialization', () => {
    it('should initialize initial datasource and visualization if present', () => {
      act(() => {
        mount(
          <EditorFrame
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
          />
        );
      });

      expect(mockVisualization.initialize).toHaveBeenCalled();
      expect(mockDatasource.initialize).toHaveBeenCalled();
    });

    it('should not initialize datasource and visualization if no initial one is specificed', () => {
      act(() => {
        mount(
          <EditorFrame
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId={null}
            initialVisualizationId={null}
          />
        );
      });

      expect(mockVisualization.initialize).not.toHaveBeenCalled();
      expect(mockDatasource.initialize).not.toHaveBeenCalled();
    });

    it('should not render something before datasource is initialized', () => {
      act(() => {
        mount(
          <EditorFrame
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
          />
        );
      });

      expect(mockVisualization.renderConfigPanel).not.toHaveBeenCalled();
      expect(mockDatasource.renderDataPanel).not.toHaveBeenCalled();
    });

    it('should render data panel after initialization is complete', async () => {
      const initialState = {};
      let databaseInitialized: ({}) => void;

      act(() => {
        mount(
          <EditorFrame
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                initialize: () =>
                  new Promise(resolve => {
                    databaseInitialized = resolve;
                  }),
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
          />
        );
      });

      databaseInitialized!(initialState);

      await waitForPromises();
      expect(mockDatasource.renderDataPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });

    it('should initialize visualization state and render config panel', async () => {
      const initialState = {};

      mount(
        <EditorFrame
          visualizationMap={{
            testVis: { ...mockVisualization, initialize: () => initialState },
          }}
          datasourceMap={{
            testDatasource: {
              ...mockDatasource,
              initialize: () => Promise.resolve(),
            },
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });
  });

  describe('state update', () => {
    it('should re-render config panel after state update', async () => {
      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      const updatedState = {};
      const setVisualizationState = (mockVisualization.renderConfigPanel as jest.Mock).mock
        .calls[0][1].setState;
      act(() => {
        setVisualizationState(updatedState);
      });

      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledTimes(2);
      expect(mockVisualization.renderConfigPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: updatedState,
        })
      );

      // don't re-render datasource when visulization changes
      expect(mockDatasource.renderDataPanel).toHaveBeenCalledTimes(1);
    });

    it('should re-render data panel after state update', async () => {
      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      const updatedState = {};
      const setDatasourceState = (mockDatasource.renderDataPanel as jest.Mock).mock.calls[0][1]
        .setState;
      act(() => {
        setDatasourceState(updatedState);
      });

      expect(mockDatasource.renderDataPanel).toHaveBeenCalledTimes(2);
      expect(mockDatasource.renderDataPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: updatedState,
        })
      );
    });

    it('should re-render config panel with updated datasource api after datasource state update', async () => {
      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      const updatedPublicAPI = {};
      mockDatasource.getPublicAPI = jest.fn(
        () => (updatedPublicAPI as unknown) as DatasourcePublicAPI
      );

      const setDatasourceState = (mockDatasource.renderDataPanel as jest.Mock).mock.calls[0][1]
        .setState;
      act(() => {
        setDatasourceState({});
      });

      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledTimes(2);
      expect(mockVisualization.renderConfigPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          datasource: updatedPublicAPI,
        })
      );
    });
  });

  describe('datasource public api communication', () => {
    it('should pass the datasource api to the visualization', async () => {
      const publicAPI = ({} as unknown) as DatasourcePublicAPI;

      mockDatasource.getPublicAPI = () => publicAPI;

      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ datasource: publicAPI })
      );
    });

    it('should give access to the datasource state in the datasource factory function', async () => {
      const datasourceState = {};
      mockDatasource.initialize = () => Promise.resolve(datasourceState);

      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      expect(mockDatasource.getPublicAPI).toHaveBeenCalledWith(
        datasourceState,
        expect.any(Function)
      );
    });

    it('should re-create the public api after state has been set', async () => {
      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      const updatedState = {};
      const setDatasourceState = (mockDatasource.getPublicAPI as jest.Mock).mock.calls[0][1];
      act(() => {
        setDatasourceState(updatedState);
      });

      expect(mockDatasource.getPublicAPI).toHaveBeenCalledTimes(2);
      expect(mockDatasource.getPublicAPI).toHaveBeenLastCalledWith(
        updatedState,
        expect.any(Function)
      );
    });
  });

  describe('switching', () => {
    let instance: ReactWrapper;
    beforeEach(async () => {
      instance = mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
            testVis2: mockVisualization2,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
            testDatasource2: mockDatasource2,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );
      await waitForPromises();

      // necessary to flush elements to dom synchronously
      instance.update();
    });

    it('should have initialized only the initial datasource and visualization', () => {
      expect(mockDatasource.initialize).toHaveBeenCalled();
      expect(mockDatasource2.initialize).not.toHaveBeenCalled();

      expect(mockVisualization.initialize).toHaveBeenCalled();
      expect(mockVisualization2.initialize).not.toHaveBeenCalled();
    });

    it('should initialize other datasource on switch', async () => {
      act(() => {
        instance
          .find('select[data-test-subj="datasource-switch"]')
          .simulate('change', { target: { value: 'testDatasource2' } });
      });
      expect(mockDatasource2.initialize).toHaveBeenCalled();
    });

    it('should call datasource render with new state on switch', async () => {
      const initialState = {};
      mockDatasource2.initialize = () => Promise.resolve(initialState);

      instance
        .find('select[data-test-subj="datasource-switch"]')
        .simulate('change', { target: { value: 'testDatasource2' } });

      await waitForPromises();

      expect(mockDatasource2.renderDataPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });

    it('should initialize other visualization on switch', async () => {
      act(() => {
        instance
          .find('select[data-test-subj="visualization-switch"]')
          .simulate('change', { target: { value: 'testVis2' } });
      });
      expect(mockVisualization2.initialize).toHaveBeenCalled();
    });

    it('should call visualization render with new state on switch', async () => {
      const initialState = {};
      mockVisualization2.initialize = () => initialState;

      act(() => {
        instance
          .find('select[data-test-subj="visualization-switch"]')
          .simulate('change', { target: { value: 'testVis2' } });
      });

      expect(mockVisualization2.renderConfigPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });
  });

  describe('suggestions', () => {
    it('should fetch suggestions of currently active datasource', async () => {
      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
            testDatasource2: mockDatasource2,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      expect(mockDatasource.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
      expect(mockDatasource2.getDatasourceSuggestionsFromCurrentState).not.toHaveBeenCalled();
    });

    it('should fetch suggestions of all visualizations', async () => {
      mount(
        <EditorFrame
          visualizationMap={{
            testVis: mockVisualization,
            testVis2: mockVisualization2,
          }}
          datasourceMap={{
            testDatasource: mockDatasource,
            testDatasource2: mockDatasource2,
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      expect(mockVisualization.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
    });

    it('should display suggestions in descending order', async () => {
      const instance = mount(
        <EditorFrame
          visualizationMap={{
            testVis: {
              ...mockVisualization,
              getSuggestions: () => [
                {
                  datasourceSuggestionId: 0,
                  score: 0.5,
                  state: {},
                  title: 'Suggestion2',
                },
                {
                  datasourceSuggestionId: 0,
                  score: 0.8,
                  state: {},
                  title: 'Suggestion1',
                },
              ],
            },
            testVis2: {
              ...mockVisualization,
              getSuggestions: () => [
                {
                  datasourceSuggestionId: 0,
                  score: 0.4,
                  state: {},
                  title: 'Suggestion4',
                },
                {
                  datasourceSuggestionId: 0,
                  score: 0.45,
                  state: {},
                  title: 'Suggestion3',
                },
              ],
            },
          }}
          datasourceMap={{
            testDatasource: {
              ...mockDatasource,
              getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            },
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      // TODO why is this necessary?
      instance.update();
      const suggestions = instance.find('[data-test-subj="suggestion"]');
      expect(suggestions.map(el => el.text())).toEqual([
        'Suggestion1',
        'Suggestion2',
        'Suggestion3',
        'Suggestion4',
      ]);
    });

    it('should switch to suggested visualization', async () => {
      const newDatasourceState = {};
      const suggestionVisState = {};
      const instance = mount(
        <EditorFrame
          visualizationMap={{
            testVis: {
              ...mockVisualization,
              getSuggestions: () => [
                {
                  datasourceSuggestionId: 0,
                  score: 0.8,
                  state: suggestionVisState,
                  title: 'Suggestion1',
                },
              ],
            },
            testVis2: mockVisualization2,
          }}
          datasourceMap={{
            testDatasource: {
              ...mockDatasource,
              getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            },
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis2"
        />
      );

      await waitForPromises();

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find('[data-test-subj="suggestion"]').simulate('click');
      });

      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledTimes(1);
      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
      expect(mockDatasource.renderDataPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: newDatasourceState,
        })
      );
    });

    it('should switch to best suggested visualization on field drop', async () => {
      const suggestionVisState = {};
      const instance = mount(
        <EditorFrame
          visualizationMap={{
            testVis: {
              ...mockVisualization,
              getSuggestions: () => [
                {
                  datasourceSuggestionId: 0,
                  score: 0.2,
                  state: {},
                  title: 'Suggestion1',
                },
                {
                  datasourceSuggestionId: 0,
                  score: 0.8,
                  state: suggestionVisState,
                  title: 'Suggestion2',
                },
              ],
            },
            testVis2: mockVisualization2,
          }}
          datasourceMap={{
            testDatasource: {
              ...mockDatasource,
              getDatasourceSuggestionsForField: () => [generateSuggestion()],
              getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            },
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find('[data-test-subj="lnsDragDrop"]').simulate('drop');
      });

      expect(mockVisualization.renderConfigPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
    });

    it('should switch to best suggested visualization regardless extension on field drop', async () => {
      const suggestionVisState = {};
      const instance = mount(
        <EditorFrame
          visualizationMap={{
            testVis: {
              ...mockVisualization,
              getSuggestions: () => [
                {
                  datasourceSuggestionId: 0,
                  score: 0.2,
                  state: {},
                  title: 'Suggestion1',
                },
                {
                  datasourceSuggestionId: 0,
                  score: 0.6,
                  state: {},
                  title: 'Suggestion2',
                },
              ],
            },
            testVis2: {
              ...mockVisualization2,
              getSuggestions: () => [
                {
                  datasourceSuggestionId: 0,
                  score: 0.8,
                  state: suggestionVisState,
                  title: 'Suggestion3',
                },
              ],
            },
          }}
          datasourceMap={{
            testDatasource: {
              ...mockDatasource,
              getDatasourceSuggestionsForField: () => [generateSuggestion()],
              getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            },
          }}
          initialDatasourceId="testDatasource"
          initialVisualizationId="testVis"
        />
      );

      await waitForPromises();

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find('[data-test-subj="lnsDragDrop"]').simulate('drop');
      });

      expect(mockVisualization2.renderConfigPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
    });
  });
});

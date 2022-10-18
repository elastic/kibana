/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataPanelWrapper } from './data_panel_wrapper';
import { Datasource, DatasourceDataPanelProps, VisualizationMap } from '../../types';
import { DragDropIdentifier } from '../../drag_drop';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createMockFramePublicAPI, mockStoreDeps, mountWithProvider } from '../../mocks';
import { disableAutoApply } from '../../state_management/lens_slice';
import { selectTriggerApplyChanges } from '../../state_management';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';

describe('Data Panel Wrapper', () => {
  describe('Datasource data panel properties', () => {
    let datasourceDataPanelProps: DatasourceDataPanelProps;
    let lensStore: Awaited<ReturnType<typeof mountWithProvider>>['lensStore'];
    beforeEach(async () => {
      const renderDataPanel = jest.fn();

      const datasourceMap = {
        activeDatasource: {
          renderDataPanel,
          getUsedDataViews: jest.fn(),
          getLayers: jest.fn(() => []),
        } as unknown as Datasource,
      };

      const mountResult = await mountWithProvider(
        <DataPanelWrapper
          datasourceMap={datasourceMap}
          visualizationMap={{} as VisualizationMap}
          showNoDataPopover={() => {}}
          core={{} as DatasourceDataPanelProps['core']}
          dropOntoWorkspace={(field: DragDropIdentifier) => {}}
          hasSuggestionForField={(field: DragDropIdentifier) => true}
          plugins={{ uiActions: {} as UiActionsStart, dataViews: {} as DataViewsPublicPluginStart }}
          indexPatternService={createIndexPatternServiceMock()}
          frame={createMockFramePublicAPI()}
        />,
        {
          preloadedState: {
            activeDatasourceId: 'activeDatasource',
            datasourceStates: {
              activeDatasource: {
                isLoading: false,
                state: {
                  age: 'old',
                },
              },
            },
          },
          storeDeps: mockStoreDeps({ datasourceMap }),
        }
      );

      lensStore = mountResult.lensStore;

      datasourceDataPanelProps = renderDataPanel.mock.calls[0][1] as DatasourceDataPanelProps;
    });

    describe('setState', () => {
      it('applies state immediately when option true', async () => {
        lensStore.dispatch(disableAutoApply());
        selectTriggerApplyChanges(lensStore.getState());

        const newDatasourceState = { age: 'new' };
        datasourceDataPanelProps.setState(newDatasourceState, { applyImmediately: true });

        expect(lensStore.getState().lens.datasourceStates.activeDatasource.state).toEqual(
          newDatasourceState
        );
        expect(selectTriggerApplyChanges(lensStore.getState())).toBeTruthy();
      });

      it('does not apply state immediately when option false', async () => {
        lensStore.dispatch(disableAutoApply());
        selectTriggerApplyChanges(lensStore.getState());

        const newDatasourceState = { age: 'new' };
        datasourceDataPanelProps.setState(newDatasourceState, { applyImmediately: false });

        const lensState = lensStore.getState().lens;
        expect(lensState.datasourceStates.activeDatasource.state).toEqual(newDatasourceState);
        expect(selectTriggerApplyChanges(lensStore.getState())).toBeFalsy();
      });
    });
  });
});

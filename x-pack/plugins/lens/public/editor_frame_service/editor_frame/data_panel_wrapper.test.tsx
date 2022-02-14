/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataPanelWrapper } from './data_panel_wrapper';
import { Datasource, DatasourceDataPanelProps } from '../../types';
import { DragDropIdentifier } from '../../drag_drop';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { mountWithProvider } from '../../mocks';

describe('Data Panel Wrapper', () => {
  it('sets up setState correctly', async () => {
    const renderDataPanel = jest.fn();

    const { lensStore } = await mountWithProvider(
      <DataPanelWrapper
        datasourceMap={{
          activeDatasource: {
            renderDataPanel,
          } as unknown as Datasource,
        }}
        showNoDataPopover={() => {}}
        core={{} as DatasourceDataPanelProps['core']}
        dropOntoWorkspace={(field: DragDropIdentifier) => {}}
        hasSuggestionForField={(field: DragDropIdentifier) => true}
        plugins={{ uiActions: {} as UiActionsStart }}
      />,
      {
        preloadedState: {
          activeDatasourceId: 'activeDatasource',
          datasourceStates: {
            activeDatasource: {
              isLoading: false,
              state: {
                internalState1: '',
              },
            },
          },
        },
      }
    );

    const datasourceDataPanelProps = renderDataPanel.mock.calls[0][1] as DatasourceDataPanelProps;

    datasourceDataPanelProps.setState({ activeDatasourceId: 'lolz' }, { applyImmediately: true });
    console.log(lensStore.getState().lens);
  });
});

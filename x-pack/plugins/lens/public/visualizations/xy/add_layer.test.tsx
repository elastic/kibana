/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AddLayerButton } from './add_layer';
import { XYState } from './types';
import { Position } from '@elastic/charts';
import { LayerTypes } from '@kbn/visualizations-plugin/common';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';
import { IconChartBarAnnotations } from '@kbn/chart-icons';

describe('AddLayerButton', () => {
  const addLayer = jest.fn();

  const renderAddLayerButton = () => {
    const state: XYState = {
      legend: { position: Position.Bottom, isVisible: true },
      valueLabels: 'show',
      preferredSeriesType: 'bar',
      layers: [
        {
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'area',
          splitAccessor: 'd',
          xAccessor: 'a',
          accessors: ['b', 'c'],
        },
      ],
    };
    const supportedLayers = [
      {
        type: LayerTypes.DATA,
        label: 'Visualization',
      },
      {
        type: LayerTypes.REFERENCELINE,
        label: LayerTypes.REFERENCELINE,
      },
      {
        type: LayerTypes.ANNOTATIONS,
        label: 'Annotations',
        icon: IconChartBarAnnotations,
        disabled: true,
      },
    ];

    const rtlRender = render(
      <AddLayerButton
        state={state}
        supportedLayers={supportedLayers}
        addLayer={addLayer}
        eventAnnotationService={eventAnnotationServiceMock}
      />
    );
    return {
      ...rtlRender,
      clickAddLayer: () => {
        fireEvent.click(screen.getByLabelText('Add layer'));
      },
      clickVisualizationButton: () => {
        fireEvent.click(screen.getByRole('button', { name: 'Visualization' }));
      },
      clickSeriesOptionsButton: (seriesType = 'line') => {
        const lineOption = screen.getByTestId(`lnsXY_seriesType-${seriesType}`);
        fireEvent.click(lineOption);
      },
      waitForSeriesOptions: async () => {
        await waitFor(() => {
          expect(screen.queryByTestId('lnsXY_seriesType-area')).toBeInTheDocument();
        });
      },
      getSeriesTypeOptions: () => {
        return within(
          screen.getByTestId('contextMenuPanelTitleButton').parentElement as HTMLElement
        )
          .getAllByRole('button')
          .map((el) => el.textContent);
      },
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all compatible series types', async () => {
    const { clickAddLayer, clickVisualizationButton, waitForSeriesOptions, getSeriesTypeOptions } =
      renderAddLayerButton();
    clickAddLayer();
    clickVisualizationButton();
    await waitForSeriesOptions();

    expect(getSeriesTypeOptions()).toEqual([
      'Select visualization type',
      'Bar vertical',
      'Bar vertical stacked',
      'Bar vertical percentage',
      'Area',
      'Area stacked',
      'Area percentage',
      'Line',
    ]);
  });
  it('calls addLayer with a proper series type when button is clicked', async () => {
    const {
      clickAddLayer,
      clickVisualizationButton,
      waitForSeriesOptions,
      clickSeriesOptionsButton,
    } = renderAddLayerButton();
    clickAddLayer();
    clickVisualizationButton();
    await waitForSeriesOptions();
    clickSeriesOptionsButton('line');
    expect(addLayer).toHaveBeenCalledWith(LayerTypes.DATA, undefined, undefined, 'line');
  });
});

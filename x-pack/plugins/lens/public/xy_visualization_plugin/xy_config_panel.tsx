/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Position } from '@elastic/charts';
import {
  EuiFieldText,
  EuiButtonGroup,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiButtonIcon,
  EuiButton,
  IconType,
} from '@elastic/eui';
import { State, SeriesType } from './types';
import { VisualizationProps } from '../types';

const chartTypeIcons: Array<{ id: SeriesType; label: string; iconType: IconType }> = [
  {
    id: 'line',
    label: 'Line',
    iconType: 'visLine',
  },
  {
    id: 'area',
    label: 'Area',
    iconType: 'visArea',
  },
  {
    id: 'bar',
    label: 'Bar',
    iconType: 'visBarVertical',
  },
  {
    id: 'horizontal_bar',
    label: 'Horizontal Bar',
    iconType: 'visBarHorizontal',
  },
];

const positionIcons = [
  {
    id: Position.Left,
    label: 'Left',
    iconType: 'arrowLeft',
  },
  {
    id: Position.Top,
    label: 'Top',
    iconType: 'arrowUp',
  },
  {
    id: Position.Bottom,
    label: 'Bottom',
    iconType: 'arrowDown',
  },
  {
    id: Position.Right,
    label: 'Right',
    iconType: 'arrowRight',
  },
];

export function XYConfigPanel(props: VisualizationProps<State>) {
  const { state, datasource, setState } = props;

  return (
    <EuiForm className="lnsConfigPanel">
      <EuiFormRow label="Chart type">
        <EuiButtonGroup
          legend="Chart Type"
          name="chartType"
          className="eui-displayInlineBlock"
          data-test-subj="lnsXY_seriesType"
          options={chartTypeIcons}
          idSelected={state.seriesType}
          onChange={seriesType => {
            const isHorizontal = seriesType === 'horizontal_bar';
            setState({
              ...state,
              seriesType: seriesType as SeriesType,
              x: {
                ...state.x,
                position: isHorizontal ? Position.Left : Position.Bottom,
              },
              y: {
                ...state.y,
                position: isHorizontal ? Position.Bottom : Position.Left,
              },
            });
          }}
          isIconOnly
        />
      </EuiFormRow>

      <EuiFormRow label="Title">
        <EuiFieldText
          placeholder="Title"
          data-test-subj="lnsXY_title"
          value={state.title}
          onChange={e => setState({ ...state, title: e.target.value })}
          aria-label="Title"
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          label="Show legend"
          checked={state.legend.isVisible}
          data-test-subj="lnsXY_legendIsVisible"
          onChange={() =>
            setState({ ...state, legend: { ...state.legend, isVisible: !state.legend.isVisible } })
          }
        />
      </EuiFormRow>

      {state.legend.isVisible && (
        <EuiFormRow label="Legend position">
          <EuiButtonGroup
            legend="Legend position"
            data-test-subj="lnsXY_legendPosition"
            name="legendPosition"
            options={positionIcons}
            idSelected={state.legend.position}
            onChange={position =>
              setState({ ...state, legend: { ...state.legend, position: position as Position } })
            }
            isIconOnly
          />
        </EuiFormRow>
      )}

      <EuiFormRow label="X Axis">
        <>
          <EuiFormRow label="Title">
            <EuiFieldText
              placeholder="Title"
              data-test-subj="lnsXY_xTitle"
              value={state.x.title}
              onChange={e => setState({ ...state, x: { ...state.x, title: e.target.value } })}
              aria-label="Title"
            />
          </EuiFormRow>

          <EuiFormRow label="Value">
            <div
              data-test-subj="lnsXY_xDimensionPanel"
              ref={el =>
                el &&
                datasource.renderDimensionPanel(el, {
                  dragDropContext: props.dragDropContext,
                  columnId: state.x.accessor,
                  filterOperations: () => true,
                })
              }
            />
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label="Show gridlines"
              data-test-subj="lnsXY_xShowGridlines"
              checked={state.x.showGridlines}
              onChange={() =>
                setState({ ...state, x: { ...state.x, showGridlines: !state.x.showGridlines } })
              }
            />
          </EuiFormRow>
        </>
      </EuiFormRow>

      <EuiFormRow label="Y Axis">
        <>
          <EuiFormRow label="Title">
            <EuiFieldText
              placeholder="Title"
              data-test-subj="lnsXY_yTitle"
              value={state.y.title}
              onChange={e => setState({ ...state, y: { ...state.y, title: e.target.value } })}
              aria-label="Title"
            />
          </EuiFormRow>

          <EuiFormRow label="Value">
            <>
              {state.y.accessors.map(accessor => (
                <div key={accessor}>
                  <div
                    data-test-subj={`lnsXY_yDimensionPanel_${accessor}`}
                    ref={el =>
                      el &&
                      datasource.renderDimensionPanel(el, {
                        dragDropContext: props.dragDropContext,
                        columnId: accessor,
                        filterOperations: op => !op.isBucketed && op.dataType === 'number',
                      })
                    }
                  />
                  <EuiButtonIcon
                    size="s"
                    color="warning"
                    data-test-subj={`lnsXY_yDimensionPanel_remove_${accessor}`}
                    iconType="trash"
                    onClick={() => {
                      datasource.removeColumnInTableSpec(accessor);
                      setState({
                        ...state,
                        y: {
                          ...state.y,
                          accessors: state.y.accessors.filter(col => col !== accessor),
                        },
                      });
                    }}
                    aria-label="Remove"
                  />
                </div>
              ))}
              <EuiButton
                data-test-subj="lnsXY_yDimensionPanel_add"
                onClick={() =>
                  setState({
                    ...state,
                    y: {
                      ...state.y,
                      accessors: [...state.y.accessors, datasource.generateColumnId()],
                    },
                  })
                }
                iconType="plusInCircle"
              />
            </>
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label="Show gridlines"
              data-test-subj="lnsXY_yShowGridlines"
              checked={state.y.showGridlines}
              onChange={() =>
                setState({ ...state, y: { ...state.y, showGridlines: !state.y.showGridlines } })
              }
            />
          </EuiFormRow>
        </>
      </EuiFormRow>
    </EuiForm>
  );
}

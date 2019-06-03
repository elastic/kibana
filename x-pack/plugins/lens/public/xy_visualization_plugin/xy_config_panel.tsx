/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { injectI18n } from '@kbn/i18n/react';
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
import { InjectedIntlProps } from 'react-intl';
import { State, SeriesType } from './types';
import { VisualizationProps, Operation } from '../types';
import { NativeRenderer } from '../native_renderer';

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

export const XYConfigPanel = injectI18n((props: VisualizationProps<State> & InjectedIntlProps) => {
  const { state, datasource, setState, intl } = props;

  return (
    <EuiForm className="lnsConfigPanel">
      <EuiFormRow
        label={intl.formatMessage({
          defaultMessage: 'Chart type',
          id: 'xpack.lens.xyChart.chartTypeLabel',
        })}
      >
        <EuiButtonGroup
          legend={intl.formatMessage({
            defaultMessage: 'Chart type',
            id: 'xpack.lens.xyChart.chartTypeLegend',
          })}
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

      <EuiFormRow
        label={intl.formatMessage({
          defaultMessage: 'Title',
          id: 'xpack.lens.xyChart.chartTitleLabel',
        })}
      >
        <EuiFieldText
          placeholder={intl.formatMessage({
            defaultMessage: 'Title',
            id: 'xpack.lens.xyChart.chartTitlePlaceholder',
          })}
          data-test-subj="lnsXY_title"
          value={state.title}
          onChange={e => setState({ ...state, title: e.target.value })}
          aria-label={intl.formatMessage({
            defaultMessage: 'Title',
            id: 'xpack.lens.xyChart.chartTitleAriaLabel',
          })}
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          label={intl.formatMessage({
            defaultMessage: 'Show legend',
            id: 'xpack.lens.xyChart.showLegendLabel',
          })}
          checked={state.legend.isVisible}
          data-test-subj="lnsXY_legendIsVisible"
          onChange={() =>
            setState({
              ...state,
              legend: { ...state.legend, isVisible: !state.legend.isVisible },
            })
          }
        />
      </EuiFormRow>

      {state.legend.isVisible && (
        <EuiFormRow
          label={intl.formatMessage({
            defaultMessage: 'Legend position',
            id: 'xpack.lens.xyChart.legendPositionLabel',
          })}
        >
          <EuiButtonGroup
            legend={intl.formatMessage({
              defaultMessage: 'Legend position',
              id: 'xpack.lens.xyChart.legendPositionLegend',
            })}
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

      <EuiFormRow
        label={intl.formatMessage({
          defaultMessage: 'X Axis',
          id: 'xpack.lens.xyChart.xAxisLabel',
        })}
      >
        <>
          <EuiFormRow
            label={intl.formatMessage({
              defaultMessage: 'Title',
              id: 'xpack.lens.xyChart.xTitleLabel',
            })}
          >
            <EuiFieldText
              placeholder={intl.formatMessage({
                defaultMessage: 'Title',
                id: 'xpack.lens.xyChart.xTitlePlaceholder',
              })}
              data-test-subj="lnsXY_xTitle"
              value={state.x.title}
              onChange={e => setState({ ...state, x: { ...state.x, title: e.target.value } })}
              aria-label={intl.formatMessage({
                defaultMessage: 'Title',
                id: 'xpack.lens.xyChart.xTitleAriaLabel',
              })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={intl.formatMessage({
              defaultMessage: 'Value',
              id: 'xpack.lens.xyChart.xValueLabel',
            })}
          >
            <NativeRenderer
              data-test-subj="lnsXY_xDimensionPanel"
              render={datasource.renderDimensionPanel}
              nativeProps={{
                columnId: state.x.accessor,
                dragDropContext: props.dragDropContext,
                // TODO: Filter out invalid x-dimension operations
                filterOperations: () => true,
              }}
            />
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label={intl.formatMessage({
                defaultMessage: 'Show gridlines',
                id: 'xpack.lens.xyChart.xShowGridlinesLabel',
              })}
              data-test-subj="lnsXY_xShowGridlines"
              checked={state.x.showGridlines}
              onChange={() =>
                setState({ ...state, x: { ...state.x, showGridlines: !state.x.showGridlines } })
              }
            />
          </EuiFormRow>
        </>
      </EuiFormRow>

      <EuiFormRow
        label={intl.formatMessage({
          defaultMessage: 'Y Axis',
          id: 'xpack.lens.xyChart.yAxisLabel',
        })}
      >
        <>
          <EuiFormRow
            label={intl.formatMessage({
              defaultMessage: 'Title',
              id: 'xpack.lens.xyChart.yTitleLabel',
            })}
          >
            <EuiFieldText
              placeholder={intl.formatMessage({
                defaultMessage: 'Title',
                id: 'xpack.lens.xyChart.yTitlePlaceholder',
              })}
              data-test-subj="lnsXY_yTitle"
              value={state.y.title}
              onChange={e => setState({ ...state, y: { ...state.y, title: e.target.value } })}
              aria-label={intl.formatMessage({
                defaultMessage: 'Title',
                id: 'xpack.lens.xyChart.yTitleAriaLabel',
              })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={intl.formatMessage({
              defaultMessage: 'Value',
              id: 'xpack.lens.xyChart.yValueLabel',
            })}
          >
            <>
              {state.y.accessors.map(accessor => (
                <div key={accessor}>
                  <NativeRenderer
                    data-test-subj={`lnsXY_yDimensionPanel_${accessor}`}
                    render={datasource.renderDimensionPanel}
                    nativeProps={{
                      columnId: accessor,
                      dragDropContext: props.dragDropContext,
                      filterOperations: (op: Operation) =>
                        !op.isBucketed && op.dataType === 'number',
                    }}
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
                    aria-label={intl.formatMessage({
                      defaultMessage: 'Remove',
                      id: 'xpack.lens.xyChart.yRemoveAriaLabel',
                    })}
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
              label={intl.formatMessage({
                defaultMessage: 'Show gridlines',
                id: 'xpack.lens.xyChart.yShowGridlinesLabel',
              })}
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
});

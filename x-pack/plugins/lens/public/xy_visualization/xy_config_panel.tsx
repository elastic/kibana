/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiFormRow,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { State, SeriesType, visualizationTypes } from './types';
import { VisualizationLayerWidgetProps, VisualizationToolbarProps } from '../types';
import { isHorizontalChart, isHorizontalSeries } from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';
import {
  FittingFunction,
  fittingFunctionDescriptions,
  fittingFunctionTitles,
} from './fitting_functions';

import './xy_config_panel.scss';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

function updateLayer(state: State, layer: UnwrapArray<State['layers']>, index: number): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

export function LayerContextMenu(props: VisualizationLayerWidgetProps<State>) {
  const { state, layerId } = props;
  const horizontalOnly = isHorizontalChart(state.layers);
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];

  if (!layer) {
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.xyChart.chartTypeLabel', {
        defaultMessage: 'Chart type',
      })}
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.xyChart.chartTypeLegend', {
          defaultMessage: 'Chart type',
        })}
        name="chartType"
        className="eui-displayInlineBlock"
        data-test-subj="lnsXY_seriesType"
        options={visualizationTypes
          .filter((t) => isHorizontalSeries(t.id as SeriesType) === horizontalOnly)
          .map((t) => ({
            id: t.id,
            label: t.label,
            iconType: t.icon || 'empty',
          }))}
        idSelected={layer.seriesType}
        onChange={(seriesType) => {
          trackUiEvent('xy_change_layer_display');
          props.setState(
            updateLayer(state, { ...layer, seriesType: seriesType as SeriesType }, index)
          );
        }}
        isIconOnly
        buttonSize="compressed"
      />
    </EuiFormRow>
  );
}

export function XyToolbar(props: VisualizationToolbarProps<State>) {
  const [open, setOpen] = useState(false);
  const hasNonBarSeries = props.state?.layers.some(
    (layer) => layer.seriesType === 'line' || layer.seriesType === 'area'
  );
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelStyle={{ width: 400 }}
          panelClassName=""
          button={
            <EuiButtonEmpty
              iconType="arrowDown"
              iconSide="right"
              onClick={() => {
                setOpen(!open);
              }}
            >
              <EuiIcon type="gear" />
            </EuiButtonEmpty>
          }
          isOpen={open}
          closePopover={() => {
            setOpen(false);
          }}
          anchorPosition="downRight"
        >
          <EuiFormRow
            label={i18n.translate('xpack.lens.xyChart.fittingLabel', {
              defaultMessage: 'Fitting function',
            })}
            helpText={
              !hasNonBarSeries &&
              i18n.translate('xpack.lens.xyChart.fittingDisabledHelpText', {
                defaultMessage: 'This setting only applies to line and area charts.',
              })
            }
          >
            <EuiSuperSelect
              disabled={!hasNonBarSeries}
              options={(Object.entries(fittingFunctionDescriptions) as Array<
                [FittingFunction, string]
              >).map(([id, description]) => {
                return {
                  value: id,
                  inputDisplay: (
                    <>
                      <strong>{fittingFunctionTitles[id]}</strong>
                      <EuiText size="s" color="subdued">
                        <p className="euiTextColor--subdued">{description}</p>
                      </EuiText>
                    </>
                  ),
                };
              })}
              valueOfSelected={props.state?.fittingFunction || 'None'}
              onChange={(value) => props.setState({ ...props.state, fittingFunction: value })}
              itemLayoutAlign="top"
              hasDividers
            />
          </EuiFormRow>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/target/common';
import { render } from 'react-dom';
import { EuiFormRow, EuiFieldNumber, EuiFieldText } from '@elastic/eui';
import { getSuggestions } from './gauge_suggestions';
import { Visualization, OperationMetadata, DatasourcePublicAPI } from '../types';
import { GaugeState } from './types';

const toExpression = (
  state: GaugeState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  attributes?: { mode?: 'reduced' | 'full'; title?: string; description?: string }
): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  const [datasource] = Object.values(datasourceLayers);
  const operation = datasource && datasource.getOperationForColumnId(state.accessor);

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_gauge_chart',
        arguments: {
          title: [attributes?.title || ''],
          description: [attributes?.description || ''],
          gaugeTitle: [(operation && operation.label) || ''],
          accessor: [state.accessor],
          target: typeof state.target !== 'undefined' ? [state.target] : [],
          min: typeof state.min !== 'undefined' ? [state.min] : [],
          max: typeof state.max !== 'undefined' ? [state.max] : [],
          type: [state.type],
          mode: [attributes?.mode || 'full'],
          subTitle: [state.subTitle || ''],
        },
      },
    ],
  };
};

export const gaugeVisualization: Visualization<GaugeState> = {
  id: 'lnsGauge',

  visualizationTypes: [
    {
      id: 'goal',
      icon: 'visGauge',
      label: i18n.translate('xpack.lens.gauge.label', {
        defaultMessage: 'Gauge',
      }),
      groupLabel: i18n.translate('xpack.lens.gauge.groupLabel', {
        defaultMessage: 'Tabular and single value',
      }),
      sortPriority: 1,
    },
    {
      id: 'verticalBullet',
      icon: 'visGauge',
      label: i18n.translate('xpack.lens.gauge.label', {
        defaultMessage: 'Bullet vertical',
      }),
      groupLabel: i18n.translate('xpack.lens.gauge.groupLabel', {
        defaultMessage: 'Tabular and single value',
      }),
      sortPriority: 1,
    },
    {
      id: 'horizontalBullet',
      icon: 'visGauge',
      label: i18n.translate('xpack.lens.gauge.label', {
        defaultMessage: 'Bullet horizontal',
      }),
      groupLabel: i18n.translate('xpack.lens.gauge.groupLabel', {
        defaultMessage: 'Tabular and single value',
      }),
      sortPriority: 1,
    },
  ],

  switchVisualizationType(type: string, state: GaugeState) {
    return {
      ...state,
      type: type as GaugeState['type'],
    };
  },

  getVisualizationTypeId(state) {
    return state.type;
  },

  clearLayer(state) {
    return {
      ...state,
      accessor: undefined,
    };
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription(state) {
    return {
      icon: 'visGauge',
      label:
        state.type === 'goal'
          ? 'Gauge'
          : state.type === 'horizontalBullet'
          ? 'Horizontal bullet'
          : 'Vertical bullet',
    };
  },

  getSuggestions,

  initialize(frame, state) {
    return (
      state || {
        layerId: frame.addNewLayer(),
        accessor: undefined,
        type: 'goal',
      }
    );
  },

  getConfiguration(props) {
    return {
      groups: [
        {
          groupId: 'value',
          groupLabel: i18n.translate('xpack.lens.gauge.valueLabel', { defaultMessage: 'Value' }),
          layerId: props.state.layerId,
          accessors: props.state.accessor ? [{ columnId: props.state.accessor }] : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
          enableDimensionEditor: true,
        },
      ],
    };
  },

  toExpression,
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(state, datasourceLayers, { mode: 'reduced' }),

  setDimension({ prevState, columnId, groupId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return {
      ...prevState,
      accessor: undefined,
    };
  },

  getErrorMessages(state) {
    // Is it possible to break it?
    return undefined;
  },

  renderDimensionEditor(el, props) {
    render(
      <>
        <EuiFormRow label="Min">
          <EuiFieldNumber
            value={props.state.min || ''}
            onChange={(e) => {
              props.setState({ ...props.state, min: Number(e.target.value) });
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Max">
          <EuiFieldNumber
            value={props.state.max || ''}
            onChange={(e) => {
              props.setState({ ...props.state, max: Number(e.target.value) });
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Target">
          <EuiFieldNumber
            value={props.state.target || ''}
            onChange={(e) => {
              props.setState({ ...props.state, target: Number(e.target.value) });
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Sub title">
          <EuiFieldText
            value={props.state.subTitle || ''}
            onChange={(e) => {
              props.setState({ ...props.state, subTitle: e.target.value });
            }}
          />
        </EuiFormRow>
      </>,
      el
    );
  },
};

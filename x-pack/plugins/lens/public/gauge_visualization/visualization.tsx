/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/target/common';
import { render } from 'react-dom';
import {
  EuiFormRow,
  EuiFieldNumber,
  EuiFieldText,
  EuiButtonEmpty,
  EuiColorPaletteDisplay,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { PaletteOutput } from 'src/plugins/charts/common';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { getSuggestions } from './gauge_suggestions';
import {
  Visualization,
  OperationMetadata,
  DatasourcePublicAPI,
  VisualizationDimensionEditorProps,
} from '../types';
import { GaugeState } from './types';
import { PalettePanelContainer } from '../datatable_visualization/components/palette_panel_container';
import {
  applyPaletteParams,
  CustomPaletteParams,
  FIXED_PROGRESSION,
  CustomizablePalette,
  CUSTOM_PALETTE,
} from '../shared_components';

const toExpression = (
  state: GaugeState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry,
  attributes?: { mode?: 'reduced' | 'full'; title?: string; description?: string }
): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  const [datasource] = Object.values(datasourceLayers);
  const operation = datasource && datasource.getOperationForColumnId(state.accessor);

  const paletteCurrentParams = (state.palette?.params || {}) as CustomPaletteParams;

  const paletteParams = {
    ...paletteCurrentParams,
    // rewrite colors and stops as two distinct arguments
    colors: (paletteCurrentParams?.stops || []).map(({ color }) => color),
    stops:
      paletteCurrentParams?.name === 'custom'
        ? (paletteCurrentParams?.stops || []).map(({ stop }) => stop)
        : [],
    reverse: false, // managed at UI level
  };

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
          palette: state.palette?.params
            ? [paletteService.get(CUSTOM_PALETTE).toExpression(paletteParams)]
            : [paletteService.get('default').toExpression()],
          subTitle: [state.subTitle || ''],
        },
      },
    ],
  };
};

export const getGaugeVisualization = (
  paletteService: PaletteRegistry
): Visualization<GaugeState> => ({
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

  toExpression: (state, layers, attributes) =>
    toExpression(state, layers, paletteService, attributes),
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(state, datasourceLayers, paletteService, { mode: 'reduced' }),

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
    render(<GaugeDimensionEditor {...props} paletteService={paletteService} />, el);
  },
});

function GaugeDimensionEditor(
  props: VisualizationDimensionEditorProps<GaugeState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  if (state?.accessor !== accessor) return null;

  const currentData = frame.activeData?.[state.layerId];

  const val = currentData?.rows[0][accessor];

  const activePalette = state?.palette || {
    type: 'palette',
    name: 'default',
  };
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(
    props.paletteService,
    activePalette as PaletteOutput<CustomPaletteParams>,
    { min: state.min!, max: state.max! }
  );

  return (
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
      <EuiFormRow
        className="lnsDynamicColoringRow"
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.paletteTableGradient.label', {
          defaultMessage: 'Color',
        })}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiColorPaletteDisplay
              data-test-subj="lnsDatatable_dynamicColoring_palette"
              palette={displayStops}
              type={FIXED_PROGRESSION}
              onClick={() => {
                setIsPaletteOpen(!isPaletteOpen);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="lnsDatatable_dynamicColoring_trigger"
              iconType="controlsHorizontal"
              onClick={() => {
                setIsPaletteOpen(!isPaletteOpen);
              }}
              size="xs"
              flush="both"
            >
              {i18n.translate('xpack.lens.paletteTableGradient.customize', {
                defaultMessage: 'Edit',
              })}
            </EuiButtonEmpty>
            <PalettePanelContainer
              siblingRef={props.panelRef}
              isOpen={isPaletteOpen}
              handleClose={() => setIsPaletteOpen(!isPaletteOpen)}
            >
              <CustomizablePalette
                palettes={props.paletteService}
                activePalette={activePalette as PaletteOutput<CustomPaletteParams>}
                dataBounds={{ min: state.min || 0, max: state.max ?? val * 1.5 }}
                setPalette={(newPalette) => {
                  setState({
                    ...state,
                    palette: newPalette,
                  });
                }}
              />
            </PalettePanelContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  CategoricalColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  PaletteRegistry,
  getPaletteColors,
  ColorMapping,
  EUIPalette,
  IKEAPalette,
  NeutralPalette,
  PastelPalette,
  TableauPalette,
  SPECIAL_RULE_MATCHES,
} from '@kbn/coloring';
import { ColorPicker, useDebouncedValue } from '@kbn/visualization-ui-components';
import { EuiButtonEmpty, EuiColorPaletteDisplay, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useState, useCallback } from 'react';
import { getColorCategories } from '@kbn/expression-xy-plugin/public';
import { PieVisualizationState } from '../../../common/types';
import { VisualizationDimensionEditorProps } from '../../types';
import { PalettePanelContainer } from '../../shared_components';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import {
  getDefaultColorForMultiMetricDimension,
  hasNonCollapsedSliceBy,
  isCollapsed,
} from './visualization';

type DimensionEditorProps = VisualizationDimensionEditorProps<PieVisualizationState> & {
  paletteService: PaletteRegistry;
  isDarkMode: boolean;
};

export function DimensionEditor(props: DimensionEditorProps) {
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<PieVisualizationState>({
      value: props.state,
      onChange: props.setState,
    });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const currentLayer = localState.layers.find((layer) => layer.layerId === props.layerId);

  const setConfig = React.useCallback(
    ({ color }) => {
      if (!currentLayer) {
        return;
      }
      const newColorsByDimension = { ...currentLayer.colorsByDimension };

      if (color) {
        newColorsByDimension[props.accessor] = color;
      } else {
        delete newColorsByDimension[props.accessor];
      }

      setLocalState({
        ...localState,
        layers: localState.layers.map((layer) =>
          layer.layerId === currentLayer.layerId
            ? {
                ...layer,
                colorsByDimension: newColorsByDimension,
              }
            : layer
        ),
      });
    },
    [currentLayer, localState, props.accessor, setLocalState]
  );

  const setColorMapping = useCallback(
    (updatedColorMap: ColorMapping.Config) => {
      setLocalState({
        ...localState,
        layers: localState.layers.map((layer) =>
          layer.layerId === currentLayer?.layerId
            ? {
                ...layer,
                colorMapping: updatedColorMap,
              }
            : layer
        ),
      });
    },
    [localState, currentLayer, setLocalState]
  );

  if (!currentLayer) {
    return null;
  }

  const firstNonCollapsedColumnId = currentLayer.primaryGroups.find(
    (id) => !isCollapsed(id, currentLayer)
  );

  const showColorPicker =
    currentLayer.metrics.includes(props.accessor) && currentLayer.allowMultipleMetrics;

  const colorPickerDisabledMessage = hasNonCollapsedSliceBy(currentLayer)
    ? ['pie', 'donut'].includes(props.state.shape)
      ? i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseSliceBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Slice by" dimensions.',
        })
      : i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseGroupBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Group by" dimensions.',
        })
    : undefined;

  // TODO: move the available palette elsewhere
  const availablePalettes = new Map<string, ColorMapping.CategoricalPalette>([
    [EUIPalette.id, EUIPalette],
    [TableauPalette.id, TableauPalette],
    [IKEAPalette.id, IKEAPalette],
    [PastelPalette.id, PastelPalette],
    [NeutralPalette.id, NeutralPalette],
  ]);
  const colors = getPaletteColors(false, currentLayer.colorMapping);
  const table = props.frame.activeData?.[currentLayer.layerId];
  const splitCategories = getColorCategories(table?.rows ?? [], props.accessor);

  return (
    <>
      {props.accessor === firstNonCollapsedColumnId && (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          className="lnsDynamicColoringClickable"
        >
          <EuiFlexItem>
            <EuiColorPaletteDisplay
              data-test-subj="lnsXY_dynamicColoring_palette"
              palette={colors}
              type={'fixed'}
              onClick={() => {
                setIsPaletteOpen(!isPaletteOpen);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="lnsXY_dynamicColoring_trigger"
              aria-label={i18n.translate('xpack.lens.paletteXYGradient.customizeLong', {
                defaultMessage: 'Edit palette',
              })}
              iconType="controlsHorizontal"
              onClick={() => {
                setIsPaletteOpen(!isPaletteOpen);
              }}
              size="xs"
              flush="both"
            >
              {i18n.translate('xpack.lens.paletteXYGradient.customize', {
                defaultMessage: 'Edit',
              })}
            </EuiButtonEmpty>
            <PalettePanelContainer
              siblingRef={props.panelRef}
              isOpen={isPaletteOpen}
              handleClose={() => setIsPaletteOpen(!isPaletteOpen)}
              title={i18n.translate('xpack.lens.table.colorByTermsPanelTitle', {
                defaultMessage: 'Color assignments',
              })}
              isTechPreview={true}
            >
              <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded">
                <CategoricalColorMapping
                  isDarkMode={props.isDarkMode}
                  model={currentLayer.colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
                  onModelUpdate={(model: ColorMapping.Config) => setColorMapping(model)}
                  palettes={availablePalettes}
                  data={{
                    type: 'categories',
                    categories: splitCategories,
                    specialHandling: SPECIAL_RULE_MATCHES,
                  }}
                />
              </div>
            </PalettePanelContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
        // <PalettePicker
        //   palettes={props.paletteService}
        //   activePalette={props.state.palette}
        //   setPalette={(newPalette) => {
        //     setLocalState({ ...props.state, palette: newPalette });
        //   }}
        // />
      )}
      {showColorPicker && (
        <ColorPicker
          {...props}
          overwriteColor={currentLayer.colorsByDimension?.[props.accessor]}
          defaultColor={getDefaultColorForMultiMetricDimension({
            layer: currentLayer,
            columnId: props.accessor,
            paletteService: props.paletteService,
            datasource: props.datasource,
            palette: props.state.palette,
          })}
          disabledMessage={colorPickerDisabledMessage}
          setConfig={setConfig}
        />
      )}
    </>
  );
}

export function DimensionDataExtraEditor(
  props: VisualizationDimensionEditorProps<PieVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const currentLayer = props.state.layers.find((layer) => layer.layerId === props.layerId);

  if (!currentLayer) {
    return null;
  }

  return (
    <>
      {[...currentLayer.primaryGroups, ...(currentLayer.secondaryGroups ?? [])].includes(
        props.accessor
      ) && (
        <CollapseSetting
          value={currentLayer?.collapseFns?.[props.accessor] || ''}
          onChange={(collapseFn) => {
            props.setState({
              ...props.state,
              layers: props.state.layers.map((layer) =>
                layer.layerId !== props.layerId
                  ? layer
                  : {
                      ...layer,
                      collapseFns: {
                        ...layer.collapseFns,
                        [props.accessor]: collapseFn,
                      },
                    }
              ),
            });
          }}
        />
      )}
    </>
  );
}

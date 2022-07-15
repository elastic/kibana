/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiColorPaletteDisplay,
  EuiFormRow,
  EuiFlexItem,
  EuiSwitchEvent,
  EuiSwitch,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  PaletteRegistry,
  CustomizablePalette,
  CUSTOM_PALETTE,
  FIXED_PROGRESSION,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
} from '@kbn/coloring';
import { css } from '@emotion/react';
import { isNumericFieldForDatatable } from '../../../common/expressions';
import { applyPaletteParams, PalettePanelContainer } from '../../shared_components';
import type { VisualizationDimensionEditorProps } from '../../types';
import { defaultPaletteParams, RANGE_MIN } from './palette_config';
import { MetricVisualizationState } from './visualization';
import { CollapseSetting } from '../../shared_components/collapse_setting';

type Props = VisualizationDimensionEditorProps<MetricVisualizationState> & {
  paletteService: PaletteRegistry;
};

export function MetricDimensionEditor(props: Props) {
  const { state, setState, accessor } = props;

  switch (accessor) {
    case state?.metricAccessor:
      return <PrimaryMetricEditor {...props} />;
    case state.breakdownByAccessor:
      return (
        <CollapseSetting
          value={state.collapseFn || ''}
          onChange={(collapseFn: string) => {
            setState({
              ...state,
              collapseFn,
            });
          }}
        />
      );
    default:
      return null;
  }
}

function PrimaryMetricEditor(props: Props) {
  const { state, setState, frame, accessor } = props;

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const currentData = frame.activeData?.[state.layerId];

  if (accessor == null || !isNumericFieldForDatatable(currentData, accessor)) {
    // TODO - do we need both these guarding conditions?
    return null;
  }

  const hasDynamicColoring = Boolean(state?.palette);

  const startWithPercentPalette = Boolean(state.maxAccessor || state.breakdownByAccessor);

  const activePalette = state?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
    params: {
      ...defaultPaletteParams,
      rangeType: startWithPercentPalette ? 'percent' : 'number',
    },
  };

  const displayStops = applyPaletteParams(props.paletteService, activePalette, {
    min: activePalette.params?.rangeMin || DEFAULT_MIN_STOP,
    max: activePalette.params?.rangeMax || DEFAULT_MAX_STOP,
  });

  const togglePalette = () => setIsPaletteOpen(!isPaletteOpen);

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.dynamicColoring.label', {
          defaultMessage: 'Color by value',
        })}
        css={css`
          align-items: center;
        `}
      >
        <EuiSwitch
          data-test-subj="lnsDynamicColoringMetricSwitch"
          compressed
          label=""
          showLabel={false}
          checked={hasDynamicColoring}
          onChange={(e: EuiSwitchEvent) => {
            const { checked } = e.target;
            const params = checked
              ? {
                  palette: {
                    ...activePalette,
                    params: {
                      ...activePalette.params,
                      stops: displayStops,
                    },
                  },
                }
              : {
                  palette: undefined,
                };

            setState({
              ...state,
              ...params,
            });
          }}
        />
      </EuiFormRow>
      {hasDynamicColoring && (
        <>
          <EuiFormRow
            className="lnsDynamicColoringRow"
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.paletteMetricGradient.label', {
              defaultMessage: 'Color',
            })}
          >
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              className="lnsDynamicColoringClickable"
            >
              <EuiFlexItem>
                <EuiColorPaletteDisplay
                  data-test-subj="lnsMetric_dynamicColoring_palette"
                  palette={displayStops.map(({ color }) => color)}
                  type={FIXED_PROGRESSION}
                  onClick={togglePalette}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="lnsMetric_dynamicColoring_trigger"
                  iconType="controlsHorizontal"
                  onClick={togglePalette}
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
                  handleClose={togglePalette}
                >
                  <CustomizablePalette
                    palettes={props.paletteService}
                    activePalette={activePalette}
                    dataBounds={{
                      min: activePalette.params!.rangeMin!,
                      max: activePalette.params!.rangeMax!,
                    }}
                    setPalette={(newPalette) => {
                      if (
                        newPalette.name !== CUSTOM_PALETTE &&
                        newPalette.params &&
                        newPalette.params.rangeMin !== RANGE_MIN
                      ) {
                        newPalette.params.rangeMin = RANGE_MIN;
                      }
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
      )}
    </>
  );
}

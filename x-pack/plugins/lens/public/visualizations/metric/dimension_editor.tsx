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
  EuiFieldText,
  EuiButtonGroup,
  EuiFieldNumber,
  htmlIdGenerator,
  EuiColorPicker,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  PaletteRegistry,
  CustomizablePalette,
  FIXED_PROGRESSION,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
} from '@kbn/coloring';
import { getDataBoundsForPalette } from '@kbn/expression-metric-vis-plugin/public';
import { css } from '@emotion/react';
import { isNumericFieldForDatatable } from '../../../common/expressions';
import {
  applyPaletteParams,
  PalettePanelContainer,
  useDebouncedValue,
} from '../../shared_components';
import type { VisualizationDimensionEditorProps } from '../../types';
import { defaultNumberPaletteParams, defaultPercentagePaletteParams } from './palette_config';
import { DEFAULT_MAX_COLUMNS, MetricVisualizationState } from './visualization';
import { CollapseSetting } from '../../shared_components/collapse_setting';

type Props = VisualizationDimensionEditorProps<MetricVisualizationState> & {
  paletteService: PaletteRegistry;
};

export function DimensionEditor(props: Props) {
  const { state, setState, accessor } = props;

  const setPrefix = useCallback(
    (prefix: string) => setState({ ...state, secondaryPrefix: prefix }),
    [setState, state]
  );

  const { inputValue: prefixInputVal, handleInputChange: handlePrefixChange } =
    useDebouncedValue<string>(
      {
        onChange: setPrefix,
        value: state.secondaryPrefix || '',
      },
      { allowFalsyValue: true }
    );

  switch (accessor) {
    case state?.metricAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_primary_metric">
          <PrimaryMetricEditor {...props} />
        </div>
      );
    case state.secondaryMetricAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_secondary_metric">
          <EuiFormRow
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.metric.prefixText.label', {
              defaultMessage: 'Prefix',
            })}
          >
            <EuiFieldText
              compressed
              value={prefixInputVal}
              onChange={({ target: { value } }) => handlePrefixChange(value)}
            />
          </EuiFormRow>
        </div>
      );
    case state.maxAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_secondary_metric">
          <MaximumEditor {...props} />
        </div>
      );
    case state.breakdownByAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_breakdown">
          <BreakdownByEditor {...props} />
        </div>
      );
    default:
      return null;
  }
}

function BreakdownByEditor({ setState, state }: Props) {
  const setMaxCols = useCallback(
    (columns: string) => {
      setState({ ...state, maxCols: parseInt(columns, 10) });
    },
    [setState, state]
  );

  const { inputValue: currentMaxCols, handleInputChange: handleMaxColsChange } =
    useDebouncedValue<string>({
      onChange: setMaxCols,
      value: String(state.maxCols ?? DEFAULT_MAX_COLUMNS),
    });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.metric.maxColumns', {
          defaultMessage: 'Layout columns',
        })}
        fullWidth
        display="columnCompressed"
      >
        <EuiFieldNumber
          compressed={true}
          min={1}
          data-test-subj="lnsMetric_max_cols"
          value={currentMaxCols}
          onChange={({ target: { value } }) => handleMaxColsChange(value)}
        />
      </EuiFormRow>
      <CollapseSetting
        value={state.collapseFn || ''}
        onChange={(collapseFn: string) => {
          setState({
            ...state,
            collapseFn,
          });
        }}
      />
    </>
  );
}

function MaximumEditor({ setState, state }: Props) {
  const idPrefix = htmlIdGenerator()();
  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
        defaultMessage: 'Bar direction',
      })}
      fullWidth
      display="columnCompressed"
    >
      <EuiButtonGroup
        isFullWidth
        buttonSize="compressed"
        legend={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
          defaultMessage: 'Bar direction',
        })}
        data-test-subj="lnsMetric_progress_direction_buttons"
        name="alignment"
        options={[
          {
            id: `${idPrefix}vertical`,
            label: i18n.translate('xpack.lens.metric.progressDirection.vertical', {
              defaultMessage: 'Vertical',
            }),
            'data-test-subj': 'lnsMetric_progress_bar_vertical',
          },
          {
            id: `${idPrefix}horizontal`,
            label: i18n.translate('xpack.lens.metric.progressDirection.horizontal', {
              defaultMessage: 'Horizontal',
            }),
            'data-test-subj': 'lnsMetric_progress_bar_horizontal',
          },
        ]}
        idSelected={`${idPrefix}${state.progressDirection ?? 'vertical'}`}
        onChange={(id) => {
          const newDirection = id.replace(idPrefix, '') as LayoutDirection;
          setState({
            ...state,
            progressDirection: newDirection,
          });
        }}
      />
    </EuiFormRow>
  );
}

function PrimaryMetricEditor(props: Props) {
  const { state, setState, frame, accessor } = props;

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const currentData = frame.activeData?.[state.layerId];

  if (accessor == null || !isNumericFieldForDatatable(currentData, accessor)) {
    return null;
  }

  const hasDynamicColoring = Boolean(state?.palette);

  const startWithPercentPalette = Boolean(state.maxAccessor || state.breakdownByAccessor);

  const activePalette = state?.palette || {
    type: 'palette',
    name: (startWithPercentPalette ? defaultPercentagePaletteParams : defaultNumberPaletteParams)
      .name,
    params: {
      ...(startWithPercentPalette ? defaultPercentagePaletteParams : defaultNumberPaletteParams),
    },
  };

  const currentMinMax = getDataBoundsForPalette(
    {
      metric: state.metricAccessor!,
      max: state.maxAccessor,
      breakdownBy: state.breakdownByAccessor,
    },
    frame.activeData?.[state.layerId]
  );

  const displayStops = applyPaletteParams(props.paletteService, activePalette, {
    min: currentMinMax.min ?? DEFAULT_MIN_STOP,
    max: currentMinMax.max ?? DEFAULT_MAX_STOP,
  });

  const togglePalette = () => setIsPaletteOpen(!isPaletteOpen);

  const idPrefix = htmlIdGenerator()();
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.dynamicColoring.label', {
          defaultMessage: 'Color mode',
        })}
        css={css`
          align-items: center;
        `}
      >
        <EuiButtonGroup
          isFullWidth
          buttonSize="compressed"
          legend={i18n.translate('xpack.lens.metric.colorMode.label', {
            defaultMessage: 'Color mode',
          })}
          data-test-subj="lnsMetric_color_mode_buttons"
          options={[
            {
              id: `${idPrefix}static`,
              label: i18n.translate('xpack.lens.metric.colorMode.static', {
                defaultMessage: 'Static',
              }),
              'data-test-subj': 'lnsMetric_color_mode_static',
            },
            {
              id: `${idPrefix}dynamic`,
              label: i18n.translate('xpack.lens.metric.colorMode.dynamic', {
                defaultMessage: 'Dynamic',
              }),
              'data-test-subj': 'lnsMetric_color_mode_dynamic',
            },
          ]}
          idSelected={`${idPrefix}${state.palette ? 'dynamic' : 'static'}`}
          onChange={(id) => {
            const colorMode = id.replace(idPrefix, '') as 'static' | 'dynamic';

            const params =
              colorMode === 'dynamic'
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
      {!hasDynamicColoring && <StaticColorControls {...props} />}
      {hasDynamicColoring && (
        <>
          <EuiFormRow
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
                    dataBounds={currentMinMax}
                    showRangeTypeSelector={Boolean(
                      state.breakdownByAccessor ||
                        state.maxAccessor ||
                        activePalette.params?.rangeType === 'percent'
                    )}
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
      )}
    </>
  );
}

function StaticColorControls({ state, setState }: Pick<Props, 'state' | 'setState'>) {
  const colorLabel = i18n.translate('xpack.lens.metric.color', {
    defaultMessage: 'Color',
  });

  const setColor = useCallback(
    (color: string) => {
      setState({ ...state, color: color === '' ? undefined : color });
    },
    [setState, state]
  );

  const { inputValue: currentColor, handleInputChange: handleColorChange } =
    useDebouncedValue<string>(
      {
        onChange: setColor,
        value: state.color || '',
      },
      { allowFalsyValue: true }
    );

  return (
    <EuiFormRow display="columnCompressed" fullWidth label={colorLabel}>
      <EuiColorPicker
        fullWidth
        data-test-subj="lnsMetric_colorpicker"
        compressed
        isClearable={true}
        onChange={(color: string) => handleColorChange(color)}
        color={currentColor}
        placeholder={i18n.translate('xpack.lens.metric.colorPlaceholder', {
          defaultMessage: 'Auto',
        })}
        aria-label={colorLabel}
        showAlpha={false}
        swatches={euiPaletteColorBlind()}
      />
    </EuiFormRow>
  );
}

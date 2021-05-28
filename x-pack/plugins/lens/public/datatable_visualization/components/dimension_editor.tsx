/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSwitch,
  EuiButtonGroup,
  htmlIdGenerator,
  EuiColorPaletteDisplay,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { VisualizationDimensionEditorProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';
import { getOriginalId } from '../transpose_helpers';
import {
  CustomizablePalette,
  applyPaletteParams,
  defaultPaletteParams,
  FIXED_PROGRESSION,
  getStopsForFixedMode,
} from '../../shared_components/';
import { PalettePanelContainer } from './palette_panel_container';
import { findMinMaxByColumnId } from './shared_utils';
import './dimension_editor.scss';

const idPrefix = htmlIdGenerator()();

type ColumnType = DatatableVisualizationState['columns'][number];

function updateColumnWith(
  state: DatatableVisualizationState,
  columnId: string,
  newColumnProps: Partial<ColumnType>
) {
  return state.columns.map((currentColumn) => {
    if (currentColumn.columnId === columnId) {
      return { ...currentColumn, ...newColumnProps };
    } else {
      return currentColumn;
    }
  });
}

export function TableDimensionEditor(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const column = state.columns.find(({ columnId }) => accessor === columnId);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  if (!column) return null;
  if (column.isTransposed) return null;

  const currentData = frame.activeData?.[state.layerId];

  // either read config state or use same logic as chart itself
  const isNumericField =
    currentData?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
      ?.meta.type === 'number';

  const currentAlignment = column?.alignment || (isNumericField ? 'right' : 'left');
  const currentColorMode = column?.colorMode || 'none';
  const hasDynamicColoring = currentColorMode !== 'none';

  const visibleColumnsCount = state.columns.filter((c) => !c.hidden).length;

  const hasTransposedColumn = state.columns.some(({ isTransposed }) => isTransposed);
  const columnsToCheck = hasTransposedColumn
    ? currentData?.columns.filter(({ id }) => getOriginalId(id) === accessor).map(({ id }) => id) ||
      []
    : [accessor];
  const minMaxByColumnId = findMinMaxByColumnId(columnsToCheck, currentData);
  const currentMinMax = minMaxByColumnId[accessor];

  const activePalette = column?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
  };
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.table.alignment.label', {
          defaultMessage: 'Text alignment',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.table.alignment.label', {
            defaultMessage: 'Text alignment',
          })}
          data-test-subj="lnsDatatable_alignment_groups"
          name="alignment"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}left`,
              label: i18n.translate('xpack.lens.table.alignment.left', {
                defaultMessage: 'Left',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_left',
            },
            {
              id: `${idPrefix}center`,
              label: i18n.translate('xpack.lens.table.alignment.center', {
                defaultMessage: 'Center',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_center',
            },
            {
              id: `${idPrefix}right`,
              label: i18n.translate('xpack.lens.table.alignment.right', {
                defaultMessage: 'Right',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${currentAlignment}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColumnType['alignment'];
            setState({
              ...state,
              columns: updateColumnWith(state, accessor, { alignment: newMode }),
            });
          }}
        />
      </EuiFormRow>
      {!column.isTransposed && (
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
            defaultMessage: 'Hide column',
          })}
          display="columnCompressedSwitch"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
              defaultMessage: 'Hide column',
            })}
            showLabel={false}
            data-test-subj="lns-table-column-hidden"
            checked={Boolean(column?.hidden)}
            disabled={!column.hidden && visibleColumnsCount <= 1}
            onChange={() => {
              const newState = {
                ...state,
                columns: state.columns.map((currentColumn) => {
                  if (currentColumn.columnId === accessor) {
                    return {
                      ...currentColumn,
                      hidden: !column.hidden,
                    };
                  } else {
                    return currentColumn;
                  }
                }),
              };
              setState(newState);
            }}
          />
        </EuiFormRow>
      )}
      {isNumericField && (
        <>
          <EuiFormRow
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.table.dynamicColoring.label', {
              defaultMessage: 'Color by value',
            })}
          >
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.table.dynamicColoring.label', {
                defaultMessage: 'Color by value',
              })}
              data-test-subj="lnsDatatable_dynamicColoring_groups"
              name="dynamicColoring"
              buttonSize="compressed"
              options={[
                {
                  id: `${idPrefix}none`,
                  label: i18n.translate('xpack.lens.table.dynamicColoring.none', {
                    defaultMessage: 'None',
                  }),
                  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_none',
                },
                {
                  id: `${idPrefix}cell`,
                  label: i18n.translate('xpack.lens.table.dynamicColoring.cell', {
                    defaultMessage: 'Cell',
                  }),
                  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_cell',
                },
                {
                  id: `${idPrefix}text`,
                  label: i18n.translate('xpack.lens.table.dynamicColoring.text', {
                    defaultMessage: 'Text',
                  }),
                  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_text',
                },
              ]}
              idSelected={`${idPrefix}${currentColorMode}`}
              onChange={(id) => {
                const newMode = id.replace(idPrefix, '') as ColumnType['colorMode'];
                const params: Partial<ColumnType> = {
                  colorMode: newMode,
                };
                if (!column?.palette && newMode !== 'none') {
                  params.palette = {
                    ...activePalette,
                    params: {
                      ...activePalette.params,
                      // that's ok, at first open we're going to throw them away and recompute
                      stops: displayStops,
                    },
                  };
                }
                // clear up when switching to no coloring
                if (column?.palette && newMode === 'none') {
                  params.palette = undefined;
                }
                setState({
                  ...state,
                  columns: updateColumnWith(state, accessor, params),
                });
              }}
            />
          </EuiFormRow>
          {hasDynamicColoring && (
            <EuiFormRow
              className="lnsDynamicColoringRow"
              display="columnCompressed"
              fullWidth
              label={i18n.translate('xpack.lens.paletteTableGradient.label', {
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
                    data-test-subj="lnsDatatable_dynamicColoring_palette"
                    palette={getStopsForFixedMode(displayStops, activePalette.params?.colorStops)}
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
                      activePalette={activePalette}
                      dataBounds={currentMinMax}
                      setPalette={(newPalette) => {
                        setState({
                          ...state,
                          columns: updateColumnWith(state, accessor, { palette: newPalette }),
                        });
                      }}
                    />
                  </PalettePanelContainer>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          )}
        </>
      )}
    </>
  );
}

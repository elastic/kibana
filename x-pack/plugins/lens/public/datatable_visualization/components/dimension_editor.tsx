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
  EuiPopover,
  EuiButtonEmpty,
} from '@elastic/eui';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { VisualizationDimensionEditorProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';
import { getOriginalId } from '../transpose_helpers';
import { CustomizablePalette, applyPaletteParams, defaultParams } from './gradient_picker';

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!column) return null;
  if (column.isTransposed) return null;

  // either read config state or use same logic as chart itself
  const isNumericField =
    frame.activeData?.[state.layerId]?.columns.find(
      (col) => col.id === accessor || getOriginalId(col.id) === accessor
    )?.meta.type === 'number';

  const currentAlignment = column?.alignment || isNumericField ? 'right' : 'left';
  const currentColorMode = column?.colorMode || 'none';
  const hasDynamicColoring = currentColorMode !== 'none';

  const visibleColumnsCount = state.columns.filter((c) => !c.hidden).length;

  const activePalette = column?.palette || {
    type: 'palette',
    name: defaultParams.name,
  };
  const { colorStops, mode: paletteMode } = applyPaletteParams(props.paletteService, activePalette);

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
                    params: { ...activePalette.params, stops: colorStops },
                  };
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
              display="columnCompressed"
              fullWidth
              label={i18n.translate('xpack.lens.paletteTableGradient.label', {
                defaultMessage: 'Color palette',
              })}
            >
              <EuiFlexGroup style={{ height: 32 }} alignItems="center" gutterSize="none">
                <EuiFlexItem>
                  <EuiColorPaletteDisplay
                    data-test-subj="lns-paletteGradientPicker"
                    palette={colorStops || []}
                    type={paletteMode}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    panelStyle={{ minWidth: 380 }}
                    button={
                      <EuiButtonEmpty
                        iconType="controlsHorizontal"
                        onClick={() => {
                          setIsPopoverOpen(!isPopoverOpen);
                        }}
                        size="xs"
                      >
                        {i18n.translate('xpack.lens.paletteTableGradient.customize', {
                          defaultMessage: 'Settings',
                        })}
                      </EuiButtonEmpty>
                    }
                    isOpen={isPopoverOpen}
                    closePopover={() => setIsPopoverOpen(false)}
                  >
                    <CustomizablePalette
                      palettes={props.paletteService}
                      activePalette={activePalette}
                      setPalette={(newPalette) => {
                        setState({
                          ...state,
                          columns: updateColumnWith(state, accessor, { palette: newPalette }),
                        });
                      }}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          )}
        </>
      )}
    </>
  );
}

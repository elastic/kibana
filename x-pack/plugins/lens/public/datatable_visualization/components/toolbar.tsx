/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch } from '@elastic/eui';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover } from '../../shared_components';
import { DatatableVisualizationState } from '../visualization';

export function TableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;
  const layer = state.layers[0];
  if (!layer) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.columnsLabel', {
          defaultMessage: 'Toggle column visibility',
        })}
        type="list"
        groupPosition="none"
        buttonDataTestSubj="lnsColumnsButton"
      >
        <EuiFlexGroup gutterSize="m" direction="column">
          {layer.columns.map((columnId) => {
            const label = props.frame.datasourceLayers[layer.layerId].getOperationForColumnId(
              columnId
            )?.label;
            const isHidden = state.hiddenColumnIds?.includes(columnId);
            return (
              <EuiFlexItem>
                <EuiSwitch
                  name={columnId}
                  label={label}
                  checked={!isHidden}
                  compressed
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newState = {
                      ...state,
                      hiddenColumnIds:
                        isHidden && state.hiddenColumnIds
                          ? state.hiddenColumnIds.filter((id) => id !== columnId)
                          : [...(state.hiddenColumnIds || []), columnId],
                    };
                    setState(newState);
                  }}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}

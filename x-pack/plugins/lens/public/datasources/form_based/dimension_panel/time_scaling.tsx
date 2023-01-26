/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiToolTip,
  EuiIcon,
  EuiFormRow,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  adjustTimeScaleLabelSuffix,
  GenericIndexPatternColumn,
  operationDefinitionMap,
} from '../operations';
import type { TimeScaleUnit } from '../../../../common/expressions';
import { unitSuffixesLong } from '../../../../common/suffix_formatter';
import type { FormBasedLayer } from '../types';

export function setTimeScaling(
  columnId: string,
  layer: FormBasedLayer,
  timeScale: TimeScaleUnit | undefined
) {
  const currentColumn = layer.columns[columnId];
  const label = currentColumn.customLabel
    ? currentColumn.label
    : adjustTimeScaleLabelSuffix(
        currentColumn.label,
        currentColumn.timeScale,
        timeScale,
        currentColumn.timeShift,
        currentColumn.timeShift,
        currentColumn.reducedTimeRange,
        currentColumn.reducedTimeRange
      );
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        label,
        timeScale,
      },
    },
  };
}

export function TimeScaling({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
}: {
  selectedColumn: GenericIndexPatternColumn;
  columnId: string;
  layer: FormBasedLayer;
  updateLayer: (newLayer: FormBasedLayer) => void;
}) {
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];

  if (!selectedOperation.timeScalingMode || selectedOperation.timeScalingMode === 'disabled') {
    return null;
  }

  return (
    <EuiFormRow
      display="rowCompressed"
      fullWidth
      label={
        <EuiToolTip
          content={i18n.translate('xpack.lens.indexPattern.timeScale.tooltip', {
            defaultMessage:
              'Normalize values to be always shown as rate per specified time unit, regardless of the underlying date interval.',
          })}
        >
          <span>
            {i18n.translate('xpack.lens.indexPattern.timeScale.label', {
              defaultMessage: 'Normalize by unit',
            })}{' '}
            <EuiIcon type="questionInCircle" color="subdued" size="s" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      }
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiSelect
            fullWidth
            compressed
            options={[
              {
                value: '',
                text: i18n.translate('xpack.lens.timeScale.normalizeNone', {
                  defaultMessage: 'None',
                }),
              },
              ...Object.entries(unitSuffixesLong).map(([unit, text]) => ({
                value: unit,
                text,
              })),
            ]}
            data-test-subj="indexPattern-time-scaling-unit"
            value={selectedColumn.timeScale ?? ''}
            onChange={(e) => {
              const value = e.target.value || undefined;
              updateLayer(setTimeScaling(columnId, layer, value as TimeScaleUnit));
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

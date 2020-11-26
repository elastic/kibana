/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import {
  EuiLink,
  EuiFormRow,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiText,
  EuiPopover,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  adjustTimeScaleLabelSuffix,
  DEFAULT_TIME_SCALE,
  IndexPatternColumn,
  operationDefinitionMap,
} from '../operations';
import { unitSuffixesLong } from '../suffix_formatter';
import { TimeScaleUnit } from '../time_scale';
import { IndexPatternLayer } from '../types';

export function setTimeScaling(
  columnId: string,
  layer: IndexPatternLayer,
  timeScale: TimeScaleUnit | undefined
) {
  const currentColumn = layer.columns[columnId];
  const label = currentColumn.customLabel
    ? currentColumn.label
    : adjustTimeScaleLabelSuffix(currentColumn.label, currentColumn.timeScale, timeScale);
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
  selectedColumn: IndexPatternColumn;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const hasDateHistogram = layer.columnOrder.some(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (
    !selectedOperation.timeScalingMode ||
    selectedOperation.timeScalingMode === 'disabled' ||
    !hasDateHistogram
  ) {
    return null;
  }

  if (!selectedColumn.timeScale) {
    return (
      <EuiText textAlign="right">
        <EuiSpacer size="s" />
        <EuiPopover
          ownFocus
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="arrowDown"
              iconSide="right"
              data-test-subj="indexPattern-time-scaling-popover"
              onClick={() => {
                setPopoverOpen(true);
              }}
            >
              {i18n.translate('xpack.lens.indexPattern.timeScale.advancedSettings', {
                defaultMessage: 'Add advanced options',
              })}
            </EuiButtonEmpty>
          }
          isOpen={popoverOpen}
          closePopover={() => {
            setPopoverOpen(false);
          }}
        >
          <EuiText size="s">
            <EuiLink
              data-test-subj="indexPattern-time-scaling-enable"
              color="text"
              onClick={() => {
                setPopoverOpen(false);
                updateLayer(setTimeScaling(columnId, layer, DEFAULT_TIME_SCALE));
              }}
            >
              {i18n.translate('xpack.lens.indexPattern.timeScale.enableTimeScale', {
                defaultMessage: 'Normalize by unit',
              })}
            </EuiLink>
          </EuiText>
        </EuiPopover>
      </EuiText>
    );
  }

  return (
    <EuiFormRow
      display="columnCompressed"
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
            compressed
            options={Object.entries(unitSuffixesLong).map(([unit, text]) => ({
              value: unit,
              text,
            }))}
            data-test-subj="indexPattern-time-scaling-unit"
            value={selectedColumn.timeScale}
            onChange={(e) => {
              updateLayer(setTimeScaling(columnId, layer, e.target.value as TimeScaleUnit));
            }}
          />
        </EuiFlexItem>
        {selectedOperation.timeScalingMode === 'optional' && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="indexPattern-time-scaling-remove"
              color="danger"
              aria-label={i18n.translate('xpack.lens.timeScale.removeLabel', {
                defaultMessage: 'Remove normalizing by time unit',
              })}
              onClick={() => {
                updateLayer(setTimeScaling(columnId, layer, undefined));
              }}
              iconType="cross"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

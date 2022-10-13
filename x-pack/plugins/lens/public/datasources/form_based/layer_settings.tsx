/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiToolTip, EuiIcon, EuiRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DatasourceLayerSettingsProps } from '../../types';
import type { FormBasedPrivateState } from './types';

const samplingValue = [0.0001, 0.001, 0.01, 0.1, 1];

export function LayerSettingsPanel({
  state,
  setState,
  layerId,
}: DatasourceLayerSettingsProps<FormBasedPrivateState>) {
  const samplingIndex = samplingValue.findIndex((v) => v === state.layers[layerId].sampling);
  const currentSamplingIndex = samplingIndex > -1 ? samplingIndex : samplingValue.length - 1;
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={
        <EuiToolTip
          content={i18n.translate('xpack.lens.xyChart.randomSampling.help', {
            defaultMessage: 'Change the sampling probability to see how your chart is affected',
          })}
          delay="long"
          position="top"
        >
          <span>
            {i18n.translate('xpack.lens.xyChart.randomSampling.label', {
              defaultMessage: 'Random Sampling',
            })}
            <EuiIcon type="questionInCircle" color="subdued" size="s" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      }
    >
      <EuiRange
        value={currentSamplingIndex}
        onChange={(e) => {
          setState({
            ...state,
            layers: {
              ...state.layers,
              [layerId]: {
                ...state.layers[layerId],
                sampling: samplingValue[Number(e.currentTarget.value)],
              },
            },
          });
        }}
        showInput={false}
        showRange={false}
        showTicks
        step={1}
        min={0}
        max={samplingValue.length - 1}
        ticks={samplingValue.map((v, i) => ({ label: `${v}`, value: i }))}
      />
    </EuiFormRow>
  );
}

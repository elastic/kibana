/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { ToolbarPopover } from '../toolbar_popover';
import { MissingValuesOptions } from './missing_values_option';
import { LineCurveOption } from './line_curve_option';
import { XYState } from '../..';

export interface VisualOptionsPopoverProps {
  state: XYState;
  setState: (newState: XYState) => void;
  isCurveTypeEnabled: boolean;
  isValueLabelsEnabled: boolean;
  isFittingEnabled: boolean;
}

export const VisualOptionsPopover: React.FC<VisualOptionsPopoverProps> = ({
  state,
  setState,
  isCurveTypeEnabled,
  isValueLabelsEnabled,
  isFittingEnabled,
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.curveLabel', {
        defaultMessage: 'Visual options',
      })}
      type="visualOptions"
      groupPosition="right"
      buttonDataTestSubj="lnsLegendButton"
      isDisabled={isCurveTypeEnabled && isValueLabelsEnabled}
    >
      <LineCurveOption
        isCurveTypeEnabled={isCurveTypeEnabled}
        value={state?.curveType}
        onChange={(id) => {
          setState({
            ...state,
            curveType: id,
          });
        }}
      />
      <EuiSpacer />

      <MissingValuesOptions
        isValueLabelsEnabled={isValueLabelsEnabled}
        valueLabels={state?.valueLabels}
        fittingFunction={state?.fittingFunction}
        isFittingEnabled={isFittingEnabled}
        onValueLabelChange={(newMode) => {
          setState({ ...state, valueLabels: newMode });
        }}
        onFittingFnChange={(newVal) => {
          setState({ ...state, fittingFunction: newVal });
        }}
      />
    </ToolbarPopover>
  );
};

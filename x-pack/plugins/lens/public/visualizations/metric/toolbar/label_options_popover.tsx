/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';

import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDebouncedValue } from '@kbn/visualization-utils';
import { TooltipWrapper } from '@kbn/visualization-utils';
import { ToolbarPopover } from '../../../shared_components';
import { MetricVisualizationState } from '../types';

export interface LabelOptionsPopoverProps {
  state: MetricVisualizationState;
  setState: (newState: MetricVisualizationState) => void;
}

export const LabelOptionsPopover: FC<LabelOptionsPopoverProps> = ({ state, setState }) => {
  const setSubtitle = useCallback(
    (prefix: string) => setState({ ...state, subtitle: prefix }),
    [setState, state]
  );

  const { inputValue: subtitleInputVal, handleInputChange: handleSubtitleChange } =
    useDebouncedValue<string>(
      {
        onChange: setSubtitle,
        value: state.subtitle || '',
      },
      { allowFalsyValue: true }
    );

  const hasBreakdownBy = Boolean(state.breakdownByAccessor);

  return (
    <TooltipWrapper
      tooltipContent={i18n.translate('xpack.lens.metric.toolbarLabelOptions.disabled', {
        defaultMessage: 'Not supported with Break down by',
      })}
      condition={hasBreakdownBy}
      position="bottom"
    >
      <ToolbarPopover
        title={i18n.translate('xpack.lens.metric.labels', {
          defaultMessage: 'Labels',
        })}
        type="labels"
        groupPosition="right"
        buttonDataTestSubj="lnsLabelsButton"
        isDisabled={hasBreakdownBy}
      >
        <EuiFormRow
          label={i18n.translate('xpack.lens.metric.subtitleLabel', {
            defaultMessage: 'Subtitle',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiFieldText
            value={subtitleInputVal}
            onChange={({ target: { value } }) => handleSubtitleChange(value)}
          />
        </EuiFormRow>
      </ToolbarPopover>
    </TooltipWrapper>
  );
};

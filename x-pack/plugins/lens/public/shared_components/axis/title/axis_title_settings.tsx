/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AxesSettingsConfig } from '../../../visualizations/xy/types';
import { type LabelMode, useDebouncedValue, VisLabel } from '../..';

type AxesSettingsConfigKeys = keyof AxesSettingsConfig;

export interface AxisTitleSettingsProps {
  /**
   * Determines the axis
   */
  axis: AxesSettingsConfigKeys;
  /**
   * Determines the axis title
   */
  axisTitle: string | undefined;
  /**
   * Callback to axis title change for both title and visibility
   */
  updateTitleState: (
    state: { title?: string; visible: boolean },
    axis: AxesSettingsConfigKeys
  ) => void;
  /**
   * Determines if the title visibility switch is on and the input text is disabled
   */
  isAxisTitleVisible: boolean;
}

export const AxisTitleSettings: React.FunctionComponent<AxisTitleSettingsProps> = ({
  axis,
  axisTitle,
  updateTitleState,
  isAxisTitleVisible,
}) => {
  const axisState = useMemo(
    () => ({
      title: axisTitle,
      visibility:
        !axisTitle && isAxisTitleVisible
          ? 'auto'
          : isAxisTitleVisible
          ? 'custom'
          : ('none' as LabelMode),
    }),
    [axisTitle, isAxisTitleVisible]
  );
  const onTitleChange = useCallback(
    ({ title, visibility }: { title?: string; visibility: LabelMode }) =>
      updateTitleState({ title, visible: visibility !== 'none' }, axis),
    [axis, updateTitleState]
  );
  const { inputValue: localAxisState, handleInputChange: onLocalTitleChange } = useDebouncedValue<{
    title?: string;
    visibility: LabelMode;
  }>(
    {
      value: axisState,
      onChange: onTitleChange,
    },
    { allowFalsyValue: true }
  );

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.label.shared.axisHeader', {
          defaultMessage: 'Axis title',
        })}
        fullWidth
      >
        <VisLabel
          header={i18n.translate('xpack.lens.shared.axisNameLabel', {
            defaultMessage: 'Axis title',
          })}
          dataTestSubj={`lns${axis}AxisTitle`}
          label={localAxisState.title || ''}
          mode={localAxisState.visibility}
          placeholder={i18n.translate('xpack.lens.shared.overwriteAxisTitle', {
            defaultMessage: 'Overwrite axis title',
          })}
          hasAutoOption={true}
          handleChange={({ mode, label }) => {
            onLocalTitleChange({ title: label, visibility: mode });
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
    </>
  );
};

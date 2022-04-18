/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AxesSettingsConfig } from '../xy_visualization/types';
import { LabelMode, useDebouncedValue, VisLabel } from '.';

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
   * Callback to axis title change
   */
  updateTitleState: (value: string) => void;
  /**
   * Determines if the title visibility switch is on and the input text is disabled
   */
  isAxisTitleVisible: boolean;
  /**
   * Toggles the axis title visibility
   */
  toggleAxisTitleVisibility: (axis: AxesSettingsConfigKeys, checked: boolean) => void;
}

export const AxisTitleSettings: React.FunctionComponent<AxisTitleSettingsProps> = ({
  axis,
  axisTitle,
  updateTitleState,
  isAxisTitleVisible,
  toggleAxisTitleVisibility,
}) => {
  const { inputValue: title, handleInputChange: onTitleChange } = useDebouncedValue<string>(
    {
      value: axisTitle || '',
      onChange: updateTitleState,
    },
    { allowFalsyValue: true }
  );
  const [titleMode, setTitleMode] = useState<LabelMode>(
    !title ? 'auto' : isAxisTitleVisible ? 'custom' : 'none'
  );

  const updateVisibility = useCallback(
    (mode: LabelMode) => {
      const visible = mode !== 'none';
      if (visible !== isAxisTitleVisible) {
        toggleAxisTitleVisibility(axis, visible);
      }
      setTitleMode(mode);
    },
    [axis, isAxisTitleVisible, toggleAxisTitleVisibility]
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
          label={title || ''}
          mode={titleMode}
          placeholder={i18n.translate('xpack.lens.shared.overwriteAxisTitle', {
            defaultMessage: 'Overwrite axis title',
          })}
          hasAutoOption={true}
          handleChange={({ mode, label }) => {
            if (title !== label) {
              onTitleChange(label);
            }
            updateVisibility(mode);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
    </>
  );
};

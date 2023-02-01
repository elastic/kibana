/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useCallback } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { optionCss } from './eui_combo_box_with_field_stats';
import { useFieldStatsFlyoutContext } from '.';
import { FieldForStats, FieldStatsInfoButton } from './field_stats_info_button';
import { Field } from '../../../../common/types/fields';

interface Option extends EuiComboBoxOptionOption<string> {
  field: Field;
}
export const useFieldStatsTrigger = () => {
  const { setIsFlyoutVisible, setFieldName } = useFieldStatsFlyoutContext();

  const closeFlyout = useCallback(() => setIsFlyoutVisible(false), [setIsFlyoutVisible]);

  const handleFieldStatsButtonClick = useCallback(
    (field: FieldForStats) => {
      if (typeof field.id === 'string') {
        setFieldName(field.id);
        setIsFlyoutVisible(true);
      }
    },
    [setFieldName, setIsFlyoutVisible]
  );
  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption, searchValue: string): ReactNode => {
      const field = (option as Option).field;
      return option.isGroupLabelOption || !field ? (
        option.label
      ) : (
        <FieldStatsInfoButton
          field={field}
          label={option.label}
          onButtonClick={handleFieldStatsButtonClick}
        />
      );
    },
    [handleFieldStatsButtonClick]
  );
  return {
    renderOption,
    setIsFlyoutVisible,
    setFieldName,
    handleFieldStatsButtonClick,
    closeFlyout,
    optionCss,
  };
};

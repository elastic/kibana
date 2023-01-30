/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useCallback } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFieldStatsFlyoutContext } from '../../../components/field_stats_flyout';
import { FieldForStats, FieldStatsInfoButton } from '../common/components/field_stats_info_button';
import { Field } from '../../../../../common/types/fields';

interface Option extends EuiComboBoxOptionOption<string> {
  field: Field;
}
const optionCss = css`
  .euiComboBoxOption__enterBadge {
    display: none;
  }
  .euiFlexGroup {
    gap: 0px;
  }
  .euiComboBoxOption__content {
    margin-left: 2px;
  }
`;

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

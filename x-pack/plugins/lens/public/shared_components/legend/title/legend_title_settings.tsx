/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-ui-components';

export interface LegendTitleSettingsProps {
  /**
   * Determines the legend title
   */
  title: string | undefined;
  /**
   * Callback to legend title change for both title and visibility
   */
  updateTitleState: (title?: string) => void;
  /**
   * Determines if the title visibility switch is on and the input text is disabled
   */
  placeholder?: string;
}

const defaultPlaceholder = i18n.translate('xpack.lens.label.shared.legendTitle.default', {
  defaultMessage: 'Legend',
});

export const LegendTitleSettings: React.FunctionComponent<LegendTitleSettingsProps> = ({
  placeholder = defaultPlaceholder,
  title,
  updateTitleState,
}) => {
  const onTitleChange = useCallback((t?: string) => updateTitleState(t), [updateTitleState]);
  const { inputValue: localTitle, handleInputChange: onLocalTitleChange } = useDebouncedValue<
    string | undefined
  >(
    {
      value: title,
      onChange: onTitleChange,
    },
    { allowFalsyValue: true }
  );

  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.label.shared.legendHeader', {
        defaultMessage: 'Legend title',
      })}
      fullWidth
    >
      <EuiFieldText
        data-test-subj="lnsLegendTitle"
        compressed
        placeholder={placeholder}
        value={localTitle || ''}
        onChange={({ target }) => onLocalTitleChange(target.value)}
        aria-label={i18n.translate('xpack.lens.label.shared.legendHeader', {
          defaultMessage: 'Legend title',
        })}
      />
    </EuiFormRow>
  );
};

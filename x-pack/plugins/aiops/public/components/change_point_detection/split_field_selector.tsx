/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { useChangePointDetectionContext } from './change_point_detection_context';

interface SplitFieldSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export const SplitFieldSelector: FC<SplitFieldSelectorProps> = React.memo(({ value, onChange }) => {
  const { splitFieldsOptions } = useChangePointDetectionContext();

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return [
      {
        name: undefined,
        displayName: i18n.translate('xpack.aiops.changePointDetection.notSelectedSplitFieldLabel', {
          defaultMessage: '--- Not selected ---',
        }),
      },
      ...splitFieldsOptions,
    ].map((v) => ({
      value: v.name,
      label: v.displayName,
    }));
  }, [splitFieldsOptions]);

  const selection = options.filter((v) => v.value === value);

  const onChangeCallback = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const option = selectedOptions[0];
      const newValue = option?.value;
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <EuiFormRow>
      <EuiComboBox
        prepend={i18n.translate('xpack.aiops.changePointDetection.selectSpitFieldLabel', {
          defaultMessage: 'Split field',
        })}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selection}
        onChange={onChangeCallback}
        isClearable
        data-test-subj="aiopsChangePointSplitField"
      />
    </EuiFormRow>
  );
});

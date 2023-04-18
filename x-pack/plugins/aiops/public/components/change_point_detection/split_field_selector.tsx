/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { type Field } from '@kbn/ml-plugin/common/types/fields';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useChangePointDetectionContext } from './change_point_detection_context';

interface SplitFieldSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export const SplitFieldSelector: FC<SplitFieldSelectorProps> = React.memo(({ value, onChange }) => {
  const { fieldStats } = useAiopsAppContext();
  const { renderOption } = fieldStats!.useFieldStatsTrigger();

  const { splitFieldsOptions } = useChangePointDetectionContext();

  const options = useMemo<EuiComboBoxOptionOption[]>(() => {
    return [
      {
        value: undefined,
        label: i18n.translate('xpack.aiops.changePointDetection.notSelectedSplitFieldLabel', {
          defaultMessage: '--- Not selected ---',
        }),
      },
      ...splitFieldsOptions.map((v) => ({
        value: v.name,
        label: v.displayName,
        ...(v.name ? { field: { id: v.name, type: v?.type } as Field } : {}),
      })),
    ];
  }, [splitFieldsOptions]);

  const selection = options.filter((v) => v.value === value);

  const onChangeCallback = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      const option = selectedOptions[0];
      const newValue = option?.value as string;
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <EuiFormRow>
      <EuiComboBox
        compressed
        prepend={i18n.translate('xpack.aiops.changePointDetection.selectSpitFieldLabel', {
          defaultMessage: 'Split field',
        })}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selection}
        onChange={onChangeCallback}
        isClearable
        data-test-subj="aiopsChangePointSplitField"
        onClick={(e) => e.stopPropagation()}
        // @ts-ignore
        renderOption={renderOption}
      />
    </EuiFormRow>
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSelect, type EuiSelectOption } from '@elastic/eui';
import { useChangePointDetectionContext } from './change_point_detection_context';

interface SplitFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const SplitFieldSelector: FC<SplitFieldSelectorProps> = React.memo(({ value, onChange }) => {
  const { splitFieldsOptions } = useChangePointDetectionContext();

  const options = useMemo<EuiSelectOption[]>(() => {
    return splitFieldsOptions.map((v) => ({ value: v.name, text: v.displayName }));
  }, [splitFieldsOptions]);

  return (
    <EuiFormRow>
      <EuiSelect
        prepend={i18n.translate('xpack.aiops.changePointDetection.selectSpitFieldLabel', {
          defaultMessage: 'Split field',
        })}
        options={options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </EuiFormRow>
  );
});

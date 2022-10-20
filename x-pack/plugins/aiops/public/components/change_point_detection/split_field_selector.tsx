/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect, type EuiSelectOption } from '@elastic/eui';
import { useDataSource } from '../../hooks/use_data_source';

interface SplitFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const SplitFieldSelector: FC<SplitFieldSelectorProps> = React.memo(({ value, onChange }) => {
  const { dataView } = useDataSource();

  const options = useMemo<EuiSelectOption[]>(() => {
    return dataView.fields
      .filter(
        ({ aggregatable, esTypes, displayName }) =>
          aggregatable &&
          esTypes &&
          esTypes.includes('keyword') &&
          !['_id', '_index'].includes(displayName)
      )
      .map((v) => ({ value: v.name, text: v.displayName }));
  }, [dataView]);

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.aiops.changePointDetection.selectSpitFieldLabel"
          defaultMessage="Split field"
        />
      }
    >
      <EuiSelect options={options} value={value} onChange={(e) => onChange(e.target.value)} />
    </EuiFormRow>
  );
});

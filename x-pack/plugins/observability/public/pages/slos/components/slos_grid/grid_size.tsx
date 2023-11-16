/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export function GridSize({ setGridSize }: { setGridSize: (gridSize?: string) => void }) {
  const [value, setValue] = useLocalStorage('slo-view-grid-size', '3');

  useEffect(() => {
    setGridSize(value);
  }, [setGridSize, value]);

  const options = [
    { value: '3', text: '3' },
    { value: '4', text: '4' },
  ];

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.observability.gridSize.euiFormRow.itemsPerRowLabel"
          defaultMessage="Items per row"
        />
      }
    >
      <EuiSelect
        data-test-subj="o11yGridSizeSelect"
        id={'grid-size-select'}
        options={options}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </EuiFormRow>
  );
}

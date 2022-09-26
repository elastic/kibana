/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiIcon, EuiSelect, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const options = [
  { text: i18n.translate('xpack.lens.collapse.none', { defaultMessage: 'None' }), value: '' },
  { text: i18n.translate('xpack.lens.collapse.sum', { defaultMessage: 'Sum' }), value: 'sum' },
  { text: i18n.translate('xpack.lens.collapse.min', { defaultMessage: 'Min' }), value: 'min' },
  { text: i18n.translate('xpack.lens.collapse.max', { defaultMessage: 'Max' }), value: 'max' },
  { text: i18n.translate('xpack.lens.collapse.avg', { defaultMessage: 'Average' }), value: 'avg' },
];

export function CollapseSetting({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <EuiFormRow
      label={
        <EuiToolTip
          delay="long"
          position="top"
          content={i18n.translate('xpack.lens.collapse.infoIcon', {
            defaultMessage:
              'Do not show this dimension in the visualization and aggregate all metric values which have the same value for this dimension into a single number.',
          })}
        >
          <span>
            {i18n.translate('xpack.lens.collapse.label', { defaultMessage: 'Collapse by' })}
            {''}
            <EuiIcon type="questionInCircle" color="subdued" size="s" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      }
      display="columnCompressed"
      fullWidth
    >
      <EuiSelect
        fullWidth
        compressed
        data-test-subj="indexPattern-terms-orderBy"
        options={options}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          onChange(e.target.value);
        }}
      />
    </EuiFormRow>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const options = [
  { value: '5000', text: '5,000' },
  { value: '10000', text: '10,000' },
  { value: '100000', text: '100,000' },
  { value: '1000000', text: '1,000,000' },
  {
    value: 'none',
    text: i18n.translate('xpack.dataVisualizer.searchPanel.esql.noLimitSize', {
      defaultMessage: 'No limit',
    }),
  },
];

export type ESQLDefaultLimitSize = '5000' | '10000' | '100000' | '1000000' | 'none';

export const ESQLDefaultLimitSize = ({
  limitSize,
  onChangeLimitSize,
}: {
  limitSize: string;
  onChangeLimitSize: (newLimit) => void;
}) => {
  const basicSelectId = useGeneratedHtmlId({ prefix: 'dvESQLLimit' });

  const onChange = (e) => {
    onChangeLimitSize(e.target.value);
  };

  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      data-test-subj="dvESQLLimitSizeOptionsFormRow"
      gutterSize="none"
      css={{ width: 120, marginLeft: 'auto' }}
    >
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.dataVisualizer.searchPanel.esql.limitSizeLabel"
          defaultMessage="Limit size"
        />
      </EuiFlexItem>
      <EuiSelect
        size="s"
        css={{ width: 50 }}
        id={basicSelectId}
        options={options}
        value={limitSize}
        onChange={onChange}
        aria-label={i18n.translate('xpack.dataVisualizer.searchPanel.esql.limitSizeAriaLabel', {
          defaultMessage: 'Limit size',
        })}
      />
    </EuiFlexGroup>
  );
};

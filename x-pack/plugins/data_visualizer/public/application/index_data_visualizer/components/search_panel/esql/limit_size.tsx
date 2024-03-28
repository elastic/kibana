/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ESQLDefaultLimitSizeOption } from '../../../embeddables/grid_embeddable/types';

const options = [
  {
    'data-test-subj': 'dvESQLLimitSize-5000',
    value: '5000',
    text: i18n.translate('xpack.dataVisualizer.searchPanel.esql.limitSizeOptionLabel', {
      defaultMessage: '{limit} rows',
      values: { limit: '5,000' },
    }),
  },
  {
    'data-test-subj': 'dvESQLLimitSize-10000',
    value: '10000',
    text: i18n.translate('xpack.dataVisualizer.searchPanel.esql.limitSizeOptionLabel', {
      defaultMessage: '{limit} rows',
      values: { limit: '10,000' },
    }),
  },
  {
    'data-test-subj': 'dvESQLLimitSize-100000',
    value: '100000',
    text: i18n.translate('xpack.dataVisualizer.searchPanel.esql.limitSizeOptionLabel', {
      defaultMessage: '{limit} rows',
      values: { limit: '100,000' },
    }),
  },
  {
    'data-test-subj': 'dvESQLLimitSize-1000000',
    value: '1000000',
    text: i18n.translate('xpack.dataVisualizer.searchPanel.esql.limitSizeOptionLabel', {
      defaultMessage: '{limit} rows',
      values: { limit: '1,000,000' },
    }),
  },
  {
    'data-test-subj': 'dvESQLLimitSize-none',
    value: 'none',
    text: i18n.translate('xpack.dataVisualizer.searchPanel.esql.analyzeAll', {
      defaultMessage: 'Analyze all',
    }),
  },
];

export const ESQLDefaultLimitSizeSelect = ({
  limitSize,
  onChangeLimitSize,
}: {
  limitSize: string;
  onChangeLimitSize: (newLimit: ESQLDefaultLimitSizeOption) => void;
}) => {
  const basicSelectId = useGeneratedHtmlId({ prefix: 'dvESQLLimit' });

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChangeLimitSize(e.target.value as ESQLDefaultLimitSizeOption);
  };

  return (
    <EuiSelect
      data-test-subj="dvESQLLimitSizeSelect"
      id={basicSelectId}
      options={options}
      value={limitSize}
      onChange={onChange}
      aria-label={i18n.translate('xpack.dataVisualizer.searchPanel.esql.limitSizeAriaLabel', {
        defaultMessage: 'Limit size',
      })}
      prepend={
        <EuiText textAlign="center">
          <FormattedMessage
            id="xpack.dataVisualizer.searchPanel.esql.limitSizeLabel"
            defaultMessage="Limit analysis to"
          />
        </EuiText>
      }
    />
  );
};

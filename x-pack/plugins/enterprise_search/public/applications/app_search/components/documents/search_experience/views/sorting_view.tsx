/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiSelectOption } from '@elastic/eui';

interface Option {
  label: string;
  value: string;
}

const wrapSortingOptionForEuiSelect: (option: Option) => EuiSelectOption = (option) => ({
  text: option.label,
  value: option.value,
});

const getValueFromOption: (option: Option) => string = (option) => option.value;

interface Props {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange(value: string): void;
}

export const SortingView: React.FC<Props> = ({ onChange, options, value }) => {
  // If we don't have the value in options, unset it
  const valuesFromOptions = options.map(getValueFromOption);
  const selectedValue = value && !valuesFromOptions.includes(value) ? undefined : value;

  return (
    <div className="sui-sorting">
      <EuiSelect
        options={options.map(wrapSortingOptionForEuiSelect)}
        value={selectedValue}
        prepend={i18n.translate('xpack.enterpriseSearch.appSearch.documents.search.sortBy', {
          defaultMessage: 'Sort by:',
        })}
        onChange={(event) => onChange(event.target.value)}
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.documents.search.sortBy.ariaLabel',
          {
            defaultMessage: 'Sort results by',
          }
        )}
      />
    </div>
  );
};

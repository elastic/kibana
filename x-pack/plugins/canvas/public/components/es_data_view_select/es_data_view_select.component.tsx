/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FocusEventHandler } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';

type DataViewOption = Pick<DataView, 'id' | 'name' | 'title'>;

export interface ESDataViewSelectProps {
  loading: boolean;
  value: string;
  dataViews: DataViewOption[];
  onChange: (string: string) => void;
  onBlur: FocusEventHandler<HTMLDivElement> | undefined;
  onFocus: FocusEventHandler<HTMLDivElement> | undefined;
}

const defaultIndex = '_all';
const defaultOption = { value: defaultIndex, label: defaultIndex };

export const ESDataViewSelect: React.FunctionComponent<ESDataViewSelectProps> = ({
  value = defaultIndex,
  loading,
  dataViews,
  onChange,
  onFocus,
  onBlur,
}) => {
  const selectedDataView = dataViews.find((view) => value === view.title) as DataView;

  const selectedOption = selectedDataView
    ? { value: selectedDataView.title, label: selectedDataView.name }
    : { value, label: value };
  const options = dataViews.map(({ name, title }) => ({ value: title, label: name }));

  return (
    <EuiComboBox
      selectedOptions={[selectedOption]}
      onChange={([view]) => {
        onChange(view.value || defaultOption.value);
      }}
      onSearchChange={(searchValue) => {
        // resets input when user starts typing
        if (searchValue) {
          onChange(defaultOption.value);
        }
      }}
      onBlur={onBlur}
      onFocus={onFocus}
      isDisabled={loading}
      options={options}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      onCreateOption={(input) => onChange(input || defaultOption.value)}
      compressed
    />
  );
};
